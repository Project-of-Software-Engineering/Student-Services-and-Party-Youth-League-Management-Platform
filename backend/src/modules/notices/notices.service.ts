import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { NoticeChannel, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { LogsService } from "../logs/logs.service";
import { NoticeResponseDto } from "./dto/notice-response.dto";
import { PublishNoticeDto } from "./dto/publish-notice.dto";

type SystemNoticeInput = {
  title: string;
  content: string;
  studentId: string;
  targetScope?: Prisma.InputJsonValue;
};

@Injectable()
export class NoticesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService
  ) {}

  async findMyNotices(currentUser: AuthUser): Promise<NoticeResponseDto[]> {
    const student = await this.prisma.student.findUnique({
      where: {
        userId: currentUser.id
      },
      select: {
        id: true
      }
    });

    if (!student) {
      return [];
    }

    const targets = await this.prisma.noticeTarget.findMany({
      where: {
        studentId: student.id
      },
      include: {
        notice: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return targets.map((target) => ({
      id: target.notice.id,
      title: target.notice.title,
      content: target.notice.content,
      channel: target.notice.channel,
      publishedAt: target.notice.publishedAt?.toISOString() ?? null,
      targetScope: target.notice.targetScope,
      recipientCount: 1,
      readCount: target.readAt ? 1 : 0,
      unreadCount: target.readAt ? 0 : 1,
      readAt: target.readAt?.toISOString() ?? null
    }));
  }

  async findPublished(limit = 20): Promise<NoticeResponseDto[]> {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const notices = await this.prisma.notice.findMany({
      include: {
        targets: true
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: normalizedLimit
    });

    return notices.map((notice) => this.toNoticeResponse(notice));
  }

  async publish(dto: PublishNoticeDto, currentUser: AuthUser): Promise<NoticeResponseDto> {
    this.assertCanPublish(currentUser);

    const recipients = await this.resolveRecipients(dto);
    const publishedAt = new Date();

    const notice = await this.prisma.notice.create({
      data: {
        title: dto.title,
        content: dto.content,
        channel: dto.channel ?? NoticeChannel.IN_APP,
        publishedById: currentUser.id,
        publishedAt,
        targetScope: {
          allStudents: dto.allStudents ?? false,
          targetStudentIds: dto.targetStudentIds ?? [],
          targetTags: dto.targetTags ?? [],
          targetGrades: dto.targetGrades ?? [],
          targetMajors: dto.targetMajors ?? [],
          targetClasses: dto.targetClasses ?? [],
          targetPoliticalStates: dto.targetPoliticalStates ?? []
        },
        targets: {
          create: recipients.map((studentId) => ({
            studentId
          }))
        }
      },
      include: {
        targets: true
      }
    });

    await this.logsService.createOperationLog({
      action: "notices.publish",
      targetType: "Notice",
      targetId: notice.id,
      operatorId: currentUser.id,
      detail: {
        title: notice.title,
        recipientCount: notice.targets.length,
        channel: notice.channel
      }
    });

    return this.toNoticeResponse(notice);
  }

  async createSystemNotice(input: SystemNoticeInput): Promise<NoticeResponseDto> {
    const publishedAt = new Date();
    const notice = await this.prisma.notice.create({
      data: {
        title: input.title,
        content: input.content,
        channel: NoticeChannel.IN_APP,
        publishedAt,
        targetScope: input.targetScope ?? {
          system: true,
          targetStudentIds: [input.studentId]
        },
        targets: {
          create: {
            studentId: input.studentId
          }
        }
      },
      include: {
        targets: true
      }
    });

    await this.logsService.createOperationLog({
      action: "notices.system",
      targetType: "Notice",
      targetId: notice.id,
      detail: {
        title: notice.title,
        recipientCount: notice.targets.length,
        channel: notice.channel
      }
    });

    return {
      id: notice.id,
      title: notice.title,
      content: notice.content,
      channel: notice.channel,
      publishedAt: notice.publishedAt?.toISOString() ?? null,
      targetScope: notice.targetScope,
      recipientCount: notice.targets.length,
      readCount: 0,
      unreadCount: notice.targets.length,
      readAt: null
    };
  }

  async markAsRead(id: string, currentUser: AuthUser): Promise<NoticeResponseDto> {
    const student = await this.prisma.student.findUnique({
      where: {
        userId: currentUser.id
      },
      select: {
        id: true
      }
    });

    if (!student) {
      throw new ForbiddenException("当前账号未绑定学生档案，无法标记通知。");
    }

    const existingTarget = await this.prisma.noticeTarget.findUnique({
      where: {
        noticeId_studentId: {
          noticeId: id,
          studentId: student.id
        }
      }
    });

    if (!existingTarget) {
      throw new NotFoundException("未找到当前学生可访问的通知。");
    }

    const target = await this.prisma.noticeTarget.update({
      where: {
        noticeId_studentId: {
          noticeId: id,
          studentId: student.id
        }
      },
      data: {
        readAt: existingTarget.readAt ?? new Date()
      },
      include: {
        notice: true
      }
    });

    return {
      id: target.notice.id,
      title: target.notice.title,
      content: target.notice.content,
      channel: target.notice.channel,
      publishedAt: target.notice.publishedAt?.toISOString() ?? null,
      targetScope: target.notice.targetScope,
      recipientCount: 1,
      readCount: 1,
      unreadCount: 0,
      readAt: target.readAt?.toISOString() ?? null
    };
  }

  private async resolveRecipients(dto: PublishNoticeDto): Promise<string[]> {
    const directIds = this.normalizeList(dto.targetStudentIds);
    if (directIds.length > 0) {
      return directIds;
    }

    if (dto.allStudents) {
      const students = await this.prisma.student.findMany({
        select: {
          id: true
        }
      });
      return students.map((student) => student.id);
    }

    const targetTags = this.normalizeList(dto.targetTags);
    const targetGrades = this.normalizeList(dto.targetGrades);
    const targetMajors = this.normalizeList(dto.targetMajors);
    const targetClasses = this.normalizeList(dto.targetClasses);
    const targetPoliticalStates = this.normalizeList(dto.targetPoliticalStates);
    const where: Prisma.StudentWhereInput = {};

    if (targetGrades.length > 0) {
      where.grade = {
        in: targetGrades
      };
    }

    if (targetMajors.length > 0) {
      where.major = {
        in: targetMajors
      };
    }

    if (targetClasses.length > 0) {
      where.className = {
        in: targetClasses
      };
    }

    if (targetPoliticalStates.length > 0) {
      where.politicalState = {
        in: targetPoliticalStates
      };
    }

    if (targetTags.length > 0) {
      where.profile = {
        tags: {
          hasSome: targetTags
        }
      };
    }

    const students = await this.prisma.student.findMany({
      where,
      select: {
        id: true
      }
    });

    return students.map((student) => student.id);
  }

  private toNoticeResponse(
    notice: Prisma.NoticeGetPayload<{
      include: {
        targets: true;
      };
    }>
  ): NoticeResponseDto {
    const readCount = notice.targets.filter((target) => Boolean(target.readAt)).length;
    const recipientCount = notice.targets.length;

    return {
      id: notice.id,
      title: notice.title,
      content: notice.content,
      channel: notice.channel,
      publishedAt: notice.publishedAt?.toISOString() ?? null,
      targetScope: notice.targetScope,
      recipientCount,
      readCount,
      unreadCount: recipientCount - readCount,
      readAt: null
    };
  }

  private normalizeList(items: string[] | undefined): string[] {
    return [
      ...new Set(
        (items ?? [])
          .map((item) => item.trim())
          .filter(Boolean)
      )
    ];
  }

  private assertCanPublish(currentUser: AuthUser) {
    const allowedRoles = new Set(["admin", "teacher", "leader"]);
    if (!currentUser.roles.some((role) => allowedRoles.has(role))) {
      throw new ForbiddenException("仅管理员、教师或领导角色可以发布通知。");
    }
  }
}

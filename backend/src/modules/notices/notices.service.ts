import { ForbiddenException, Injectable } from "@nestjs/common";
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

    return notices.map((notice) => ({
      id: notice.id,
      title: notice.title,
      content: notice.content,
      channel: notice.channel,
      publishedAt: notice.publishedAt?.toISOString() ?? null,
      targetScope: notice.targetScope,
      recipientCount: notice.targets.length,
      readAt: null
    }));
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
          targetTags: dto.targetTags ?? []
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

    return {
      id: notice.id,
      title: notice.title,
      content: notice.content,
      channel: notice.channel,
      publishedAt: notice.publishedAt?.toISOString() ?? null,
      targetScope: notice.targetScope,
      recipientCount: notice.targets.length,
      readAt: null
    };
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
      readAt: null
    };
  }

  private async resolveRecipients(dto: PublishNoticeDto): Promise<string[]> {
    const directIds = dto.targetStudentIds?.filter(Boolean) ?? [];
    if (directIds.length > 0) {
      return [...new Set(directIds)];
    }

    const targetTags = dto.targetTags?.filter(Boolean) ?? [];
    if (targetTags.length > 0) {
      const students = await this.prisma.student.findMany({
        where: {
          profile: {
            tags: {
              hasSome: targetTags
            }
          }
        },
        select: {
          id: true
        }
      });
      return students.map((student) => student.id);
    }

    const students = await this.prisma.student.findMany({
      select: {
        id: true
      }
    });

    return students.map((student) => student.id);
  }

  private assertCanPublish(currentUser: AuthUser) {
    const allowedRoles = new Set(["admin", "teacher", "leader"]);
    if (!currentUser.roles.some((role) => allowedRoles.has(role))) {
      throw new ForbiddenException("仅管理员、教师或领导角色可以发布通知。");
    }
  }
}

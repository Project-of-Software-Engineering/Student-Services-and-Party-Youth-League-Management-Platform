import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  Approval,
  ApprovalStatus,
  ApprovalStep,
  ApprovalStepDecision,
  Attachment,
  Prisma,
  Student,
  User
} from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { LogsService } from "../logs/logs.service";
import { ApprovalResponseDto } from "./dto/approval-response.dto";
import { CreateApprovalDto } from "./dto/create-approval.dto";
import { DecisionApprovalDto } from "./dto/decision-approval.dto";
import { SubmitApprovalDto } from "./dto/submit-approval.dto";

const APPROVAL_WORKFLOW = [
  { stepNo: 1, roleCode: "teacher" },
  { stepNo: 2, roleCode: "admin" },
  { stepNo: 3, roleCode: "leader" }
] as const;

type ApprovalWithRelations = Approval & {
  student: Student;
  steps: Array<ApprovalStep & { operator: User | null }>;
  attachments?: Attachment[];
};

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService
  ) {}

  async findAll(
    currentUser: AuthUser,
    filters: { status?: string; mine?: boolean; limit?: number }
  ): Promise<ApprovalResponseDto[]> {
    const normalizedLimit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
    const where = this.buildApprovalWhere(currentUser, filters);
    const approvals = await this.prisma.approval.findMany({
      where,
      include: this.approvalInclude,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: normalizedLimit
    });

    return this.withAttachments(approvals);
  }

  async findOne(id: string, currentUser: AuthUser): Promise<ApprovalResponseDto> {
    const approval = await this.loadApproval(id);
    this.assertCanViewApproval(approval, currentUser);
    return this.toResponse(approval);
  }

  async create(dto: CreateApprovalDto, currentUser: AuthUser): Promise<ApprovalResponseDto> {
    const studentId = await this.resolveStudentId(dto.studentId, currentUser);

    const approval = await this.prisma.approval.create({
      data: {
        studentId,
        type: dto.type,
        reason: dto.reason,
        status: ApprovalStatus.DRAFT,
        currentStep: 0,
        steps: {
          create: APPROVAL_WORKFLOW.map((step) => ({
            stepNo: step.stepNo,
            roleCode: step.roleCode
          }))
        }
      }
    });

    await this.attachFiles(approval.id, dto.attachmentIds, currentUser);

    await this.logsService.createOperationLog({
      action: "approvals.create",
      targetType: "Approval",
      targetId: approval.id,
      operatorId: currentUser.id,
      detail: {
        type: approval.type,
        status: approval.status
      }
    });

    return this.findOne(approval.id, currentUser);
  }

  async submit(
    id: string,
    dto: SubmitApprovalDto,
    currentUser: AuthUser
  ): Promise<ApprovalResponseDto> {
    const approval = await this.loadApproval(id);
    this.assertCanEditApproval(approval, currentUser);

    if (approval.status !== ApprovalStatus.DRAFT && approval.status !== ApprovalStatus.RETURNED) {
      throw new BadRequestException("只有草稿或退回补充材料的审批单可以提交。");
    }

    await this.prisma.$transaction([
      this.prisma.approval.update({
        where: { id },
        data: {
          status: ApprovalStatus.SUBMITTED,
          currentStep: 0,
          submittedAt: new Date(),
          finishedAt: null
        }
      }),
      this.prisma.approvalStep.updateMany({
        where: { approvalId: id },
        data: {
          decision: ApprovalStepDecision.PENDING,
          operatorId: null,
          comment: null,
          decidedAt: null
        }
      })
    ]);

    await this.attachFiles(id, dto.attachmentIds, currentUser);

    await this.logsService.createOperationLog({
      action: "approvals.submit",
      targetType: "Approval",
      targetId: id,
      operatorId: currentUser.id,
      detail: {
        type: approval.type,
        comment: dto.comment ?? null
      }
    });

    return this.findOne(id, currentUser);
  }

  approve(
    id: string,
    dto: DecisionApprovalDto,
    currentUser: AuthUser
  ): Promise<ApprovalResponseDto> {
    return this.decide(id, dto, currentUser, ApprovalStepDecision.APPROVED);
  }

  reject(
    id: string,
    dto: DecisionApprovalDto,
    currentUser: AuthUser
  ): Promise<ApprovalResponseDto> {
    return this.decide(id, dto, currentUser, ApprovalStepDecision.REJECTED);
  }

  returnForSupplement(
    id: string,
    dto: DecisionApprovalDto,
    currentUser: AuthUser
  ): Promise<ApprovalResponseDto> {
    return this.decide(id, dto, currentUser, ApprovalStepDecision.RETURNED);
  }

  async getSummary(currentUser: AuthUser) {
    const where = this.buildVisibilityWhere(currentUser);
    const approvalIds = await this.findVisibleApprovalIds(currentUser);

    const [
      statusGroups,
      typeGroups,
      pendingFinalCount,
      visibleStudentCount,
      attachmentCount,
      recentApprovals
    ] = await Promise.all([
      this.prisma.approval.groupBy({
        by: ["status"],
        where,
        _count: {
          _all: true
        }
      }),
      this.prisma.approval.groupBy({
        by: ["type"],
        where,
        _count: {
          _all: true
        }
      }),
      this.prisma.approval.count({
        where: {
          ...where,
          status: {
            in: [ApprovalStatus.SUBMITTED, ApprovalStatus.IN_REVIEW]
          },
          currentStep: APPROVAL_WORKFLOW.length - 1
        }
      }),
      this.countVisibleActiveStudents(currentUser),
      this.prisma.attachment.count({
        where: {
          ownerType: "approval",
          ownerId: {
            in: approvalIds
          }
        }
      }),
      this.prisma.approval.findMany({
        where,
        include: this.approvalInclude,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 6
      })
    ]);

    const counts = this.buildStatusCounts(statusGroups);
    const recent = await this.withAttachments(recentApprovals);

    return {
      generatedAt: new Date().toISOString(),
      counts: {
        ...counts,
        total: Object.values(counts).reduce((sum, value) => sum + value, 0),
        pendingFinal: pendingFinalCount,
        attachments: attachmentCount,
        activeStudents: visibleStudentCount
      },
      typeDistribution: typeGroups.map((item) => ({
        type: item.type,
        count: item._count._all
      })),
      recent
    };
  }

  async exportCsv(currentUser: AuthUser): Promise<string> {
    const approvals = await this.prisma.approval.findMany({
      where: this.buildVisibilityWhere(currentUser),
      include: this.approvalInclude,
      orderBy: [{ createdAt: "desc" }]
    });

    const header = [
      "审批编号",
      "学生姓名",
      "学号",
      "审批类型",
      "状态",
      "当前步骤",
      "提交时间",
      "完成时间",
      "申请原因"
    ];
    const rows = approvals.map((approval) => [
      approval.id,
      approval.student.name,
      approval.student.studentNo,
      approval.type,
      approval.status,
      this.getCurrentStepLabel(approval),
      approval.submittedAt?.toISOString() ?? "",
      approval.finishedAt?.toISOString() ?? "",
      approval.reason
    ]);

    return `\ufeff${[header, ...rows].map((row) => row.map(this.escapeCsv).join(",")).join("\n")}`;
  }

  private async decide(
    id: string,
    dto: DecisionApprovalDto,
    currentUser: AuthUser,
    decision: ApprovalStepDecision
  ): Promise<ApprovalResponseDto> {
    const approval = await this.loadApproval(id);
    const currentStep = this.getCurrentPendingStep(approval);
    this.assertCanDecideApproval(approval, currentStep, currentUser);

    const decidedAt = new Date();
    const isLastStep = approval.currentStep >= APPROVAL_WORKFLOW.length - 1;
    const approvalUpdate = this.buildDecisionApprovalUpdate(approval, decision, isLastStep);

    await this.prisma.$transaction(async (tx) => {
      const stepUpdate = await tx.approvalStep.updateMany({
        where: {
          id: currentStep.id,
          decision: ApprovalStepDecision.PENDING
        },
        data: {
          decision,
          operatorId: currentUser.id,
          comment: dto.comment ?? null,
          decidedAt
        }
      });

      if (stepUpdate.count !== 1) {
        throw new BadRequestException("当前审批节点已被处理，请刷新后重试。");
      }

      const approvalUpdateResult = await tx.approval.updateMany({
        where: {
          id,
          currentStep: approval.currentStep,
          status: {
            in: [ApprovalStatus.SUBMITTED, ApprovalStatus.IN_REVIEW]
          }
        },
        data: approvalUpdate
      });

      if (approvalUpdateResult.count !== 1) {
        throw new BadRequestException("审批单状态已变化，请刷新后重试。");
      }
    });

    await this.logsService.createOperationLog({
      action: `approvals.${decision.toLowerCase()}`,
      targetType: "Approval",
      targetId: id,
      operatorId: currentUser.id,
      detail: {
        type: approval.type,
        stepNo: currentStep.stepNo,
        roleCode: currentStep.roleCode,
        comment: dto.comment ?? null
      }
    });

    return this.findOne(id, currentUser);
  }

  private buildDecisionApprovalUpdate(
    approval: ApprovalWithRelations,
    decision: ApprovalStepDecision,
    isLastStep: boolean
  ): Prisma.ApprovalUpdateManyMutationInput {
    if (decision === ApprovalStepDecision.REJECTED) {
      return {
        status: ApprovalStatus.REJECTED,
        finishedAt: new Date()
      };
    }

    if (decision === ApprovalStepDecision.RETURNED) {
      return {
        status: ApprovalStatus.RETURNED,
        finishedAt: null
      };
    }

    if (isLastStep) {
      return {
        status: ApprovalStatus.APPROVED,
        finishedAt: new Date()
      };
    }

    return {
      status: ApprovalStatus.IN_REVIEW,
      currentStep: approval.currentStep + 1
    };
  }

  private get approvalInclude() {
    return {
      student: true,
      steps: {
        include: {
          operator: true
        },
        orderBy: {
          stepNo: "asc" as const
        }
      }
    };
  }

  private async loadApproval(id: string): Promise<ApprovalWithRelations> {
    const approval = await this.prisma.approval.findUnique({
      where: { id },
      include: this.approvalInclude
    });

    if (!approval) {
      throw new NotFoundException("审批单不存在。");
    }

    return {
      ...approval,
      attachments: await this.prisma.attachment.findMany({
        where: {
          ownerType: "approval",
          ownerId: approval.id
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    };
  }

  private async withAttachments(
    approvals: Array<Approval & { student: Student; steps: Array<ApprovalStep & { operator: User | null }> }>
  ): Promise<ApprovalResponseDto[]> {
    if (approvals.length === 0) {
      return [];
    }

    const attachments = await this.prisma.attachment.findMany({
      where: {
        ownerType: "approval",
        ownerId: {
          in: approvals.map((approval) => approval.id)
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const attachmentMap = new Map<string, Attachment[]>();
    for (const attachment of attachments) {
      const list = attachmentMap.get(attachment.ownerId) ?? [];
      list.push(attachment);
      attachmentMap.set(attachment.ownerId, list);
    }

    return approvals.map((approval) =>
      this.toResponse({
        ...approval,
        attachments: attachmentMap.get(approval.id) ?? []
      })
    );
  }

  private toResponse(approval: ApprovalWithRelations): ApprovalResponseDto {
    return {
      id: approval.id,
      type: approval.type,
      reason: approval.reason,
      status: approval.status,
      currentStep: approval.currentStep,
      submittedAt: approval.submittedAt?.toISOString() ?? null,
      finishedAt: approval.finishedAt?.toISOString() ?? null,
      createdAt: approval.createdAt.toISOString(),
      updatedAt: approval.updatedAt.toISOString(),
      student: {
        id: approval.student.id,
        studentNo: approval.student.studentNo,
        name: approval.student.name,
        grade: approval.student.grade,
        major: approval.student.major,
        className: approval.student.className,
        politicalState: approval.student.politicalState
      },
      steps: approval.steps.map((step) => ({
        id: step.id,
        stepNo: step.stepNo,
        roleCode: step.roleCode,
        decision: step.decision,
        comment: step.comment,
        decidedAt: step.decidedAt?.toISOString() ?? null,
        operator: step.operator
          ? {
              id: step.operator.id,
              username: step.operator.username,
              displayName: step.operator.displayName
            }
          : null
      })),
      attachments: (approval.attachments ?? []).map((attachment) => ({
        id: attachment.id,
        ownerType: attachment.ownerType,
        ownerId: attachment.ownerId,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        uploadedBy: attachment.uploadedBy,
        createdAt: attachment.createdAt.toISOString(),
        downloadUrl: `/api/files/${attachment.id}/download`
      }))
    };
  }

  private async resolveStudentId(studentId: string | undefined, currentUser: AuthUser): Promise<string> {
    const ownStudent = await this.prisma.student.findUnique({
      where: {
        userId: currentUser.id
      },
      select: {
        id: true
      }
    });

    if (studentId) {
      if (!this.isPrivilegedUser(currentUser) && ownStudent?.id !== studentId) {
        throw new ForbiddenException("只能为本人发起审批。");
      }

      const student = await this.prisma.student.findUnique({
        where: {
          id: studentId
        },
        select: {
          id: true
        }
      });

      if (!student) {
        throw new BadRequestException("指定学生不存在。");
      }

      return student.id;
    }

    if (ownStudent) {
      return ownStudent.id;
    }

    throw new BadRequestException("请指定学生，或使用已绑定学生档案的账号发起审批。");
  }

  private async attachFiles(
    approvalId: string,
    attachmentIds: string[] | undefined,
    currentUser: AuthUser
  ) {
    if (!attachmentIds?.length) {
      return;
    }

    const uniqueAttachmentIds = [...new Set(attachmentIds)];
    const result = await this.prisma.attachment.updateMany({
      where: {
        id: {
          in: uniqueAttachmentIds
        },
        uploadedBy: currentUser.id,
        OR: [
          { ownerType: "general" },
          { ownerType: "approval", ownerId: approvalId }
        ]
      },
      data: {
        ownerType: "approval",
        ownerId: approvalId
      }
    });

    if (result.count !== uniqueAttachmentIds.length) {
      throw new BadRequestException("存在无权关联或已绑定到其他业务的附件。");
    }
  }

  private buildApprovalWhere(
    currentUser: AuthUser,
    filters: { status?: string; mine?: boolean }
  ): Prisma.ApprovalWhereInput {
    const where: Prisma.ApprovalWhereInput = {
      ...this.buildVisibilityWhere(currentUser, filters.mine)
    };
    const status = this.parseApprovalStatus(filters.status);
    if (status) {
      where.status = status;
    }
    return where;
  }

  private buildVisibilityWhere(currentUser: AuthUser, forceMine = false): Prisma.ApprovalWhereInput {
    if (forceMine || !this.isPrivilegedUser(currentUser)) {
      return {
        student: {
          userId: currentUser.id
        }
      };
    }

    return {};
  }

  private async findVisibleApprovalIds(currentUser: AuthUser): Promise<string[]> {
    const approvals = await this.prisma.approval.findMany({
      where: this.buildVisibilityWhere(currentUser),
      select: {
        id: true
      }
    });

    return approvals.map((approval) => approval.id);
  }

  private countVisibleActiveStudents(currentUser: AuthUser): Promise<number> {
    if (this.isPrivilegedUser(currentUser)) {
      return this.prisma.student.count({
        where: {
          status: "ACTIVE"
        }
      });
    }

    return this.prisma.student.count({
      where: {
        userId: currentUser.id,
        status: "ACTIVE"
      }
    });
  }

  private assertCanViewApproval(approval: ApprovalWithRelations, currentUser: AuthUser) {
    if (this.isPrivilegedUser(currentUser) || approval.student.userId === currentUser.id) {
      return;
    }

    throw new ForbiddenException("无权查看该审批单。");
  }

  private assertCanEditApproval(approval: ApprovalWithRelations, currentUser: AuthUser) {
    if (approval.student.userId === currentUser.id || this.hasAnyRole(currentUser, ["admin", "teacher"])) {
      return;
    }

    throw new ForbiddenException("无权提交该审批单。");
  }

  private assertCanDecideApproval(
    approval: ApprovalWithRelations,
    currentStep: ApprovalStep & { operator: User | null },
    currentUser: AuthUser
  ) {
    if (approval.status !== ApprovalStatus.SUBMITTED && approval.status !== ApprovalStatus.IN_REVIEW) {
      throw new BadRequestException("当前审批单不在可审批状态。");
    }

    if (this.hasAnyRole(currentUser, [currentStep.roleCode, "admin"])) {
      return;
    }

    throw new ForbiddenException("当前账号没有处理该审批节点的权限。");
  }

  private getCurrentPendingStep(approval: ApprovalWithRelations) {
    const stepNo = approval.currentStep + 1;
    const currentStep = approval.steps.find((step) => step.stepNo === stepNo);

    if (!currentStep || currentStep.decision !== ApprovalStepDecision.PENDING) {
      throw new BadRequestException("当前审批节点不可处理。");
    }

    return currentStep;
  }

  private parseApprovalStatus(status: string | undefined): ApprovalStatus | undefined {
    if (!status) {
      return undefined;
    }

    return Object.values(ApprovalStatus).includes(status as ApprovalStatus)
      ? (status as ApprovalStatus)
      : undefined;
  }

  private isPrivilegedUser(currentUser: AuthUser): boolean {
    return this.hasAnyRole(currentUser, ["admin", "teacher", "leader"]);
  }

  private hasAnyRole(currentUser: AuthUser, roles: string[]): boolean {
    const allowed = new Set(roles);
    return currentUser.roles.some((role) => allowed.has(role));
  }

  private buildStatusCounts(
    groups: Array<{ status: ApprovalStatus; _count: { _all: number } }>
  ): Record<Lowercase<ApprovalStatus>, number> {
    const counts = {
      draft: 0,
      submitted: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
      returned: 0
    };

    for (const group of groups) {
      counts[group.status.toLowerCase() as Lowercase<ApprovalStatus>] = group._count._all;
    }

    return counts;
  }

  private getCurrentStepLabel(approval: ApprovalWithRelations): string {
    const step = approval.steps.find((item) => item.stepNo === approval.currentStep + 1);
    return step ? `${step.stepNo}-${step.roleCode}` : "";
  }

  private escapeCsv(value: unknown): string {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }
}

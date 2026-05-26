import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { LogsService } from "../logs/logs.service";
import { UpsertLeagueBranchDto } from "./dto/league-branch.dto";

@Injectable()
export class LeagueBranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService
  ) {}

  async findAll(currentUser: AuthUser) {
    const branches = await this.prisma.leagueBranch.findMany({
      where: this.buildWhere(currentUser),
      include: {
        maintainedBy: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        },
        students: {
          select: {
            id: true,
            studentNo: true,
            name: true,
            politicalState: true,
            status: true
          },
          orderBy: {
            studentNo: "asc"
          }
        }
      },
      orderBy: [{ grade: "desc" }, { major: "asc" }, { className: "asc" }]
    });

    return branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      grade: branch.grade,
      major: branch.major,
      className: branch.className,
      secretaryName: branch.secretaryName,
      contact: branch.contact,
      description: branch.description,
      activityPlan: branch.activityPlan,
      memberSummary: branch.memberSummary,
      maintainedBy: branch.maintainedBy,
      students: branch.students,
      memberCount: branch.students.length,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString()
    }));
  }

  async create(dto: UpsertLeagueBranchDto, currentUser: AuthUser) {
    this.assertCanManageAll(currentUser);
    const branch = await this.prisma.leagueBranch.create({
      data: {
        ...this.toCreateData(dto),
        maintainedById: currentUser.id
      }
    });

    await this.syncStudents(branch.id, dto);
    await this.log("league_branches.create", branch.id, dto, currentUser);
    return this.findOne(branch.id, currentUser);
  }

  async update(id: string, dto: UpsertLeagueBranchDto, currentUser: AuthUser) {
    const existing = await this.prisma.leagueBranch.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("班团组织不存在。");
    }
    this.assertCanManageBranch(existing, currentUser);

    await this.prisma.leagueBranch.update({
      where: { id },
      data: this.toUpdateData(dto)
    });
    await this.syncStudents(id, dto);
    await this.log("league_branches.update", id, dto, currentUser);
    return this.findOne(id, currentUser);
  }

  private async findOne(id: string, currentUser: AuthUser) {
    const branch = (await this.findAll(currentUser)).find((item) => item.id === id);
    if (!branch) {
      throw new NotFoundException("班团组织不存在或无权查看。");
    }
    return branch;
  }

  private buildWhere(currentUser: AuthUser): Prisma.LeagueBranchWhereInput {
    if (this.hasAnyRole(currentUser, ["admin", "teacher", "leader"])) {
      return {};
    }
    if (currentUser.roles.includes("league_secretary")) {
      return {
        maintainedById: currentUser.id
      };
    }
    return {
      students: {
        some: {
          userId: currentUser.id
        }
      }
    };
  }

  private toCreateData(dto: UpsertLeagueBranchDto): Prisma.LeagueBranchUncheckedCreateInput {
    return {
      name: dto.name,
      grade: dto.grade,
      major: dto.major,
      className: dto.className,
      secretaryName: dto.secretaryName ?? null,
      contact: dto.contact ?? null,
      description: dto.description ?? null,
      activityPlan: dto.activityPlan ?? null,
      memberSummary: this.toJson(dto.memberSummary)
    };
  }

  private toUpdateData(dto: UpsertLeagueBranchDto): Prisma.LeagueBranchUncheckedUpdateInput {
    return {
      name: dto.name,
      grade: dto.grade,
      major: dto.major,
      className: dto.className,
      secretaryName: dto.secretaryName ?? null,
      contact: dto.contact ?? null,
      description: dto.description ?? null,
      activityPlan: dto.activityPlan ?? null,
      memberSummary: this.toJson(dto.memberSummary)
    };
  }

  private toJson(value: Record<string, unknown> | undefined): Prisma.InputJsonValue {
    return (value ?? {}) as Prisma.InputJsonObject;
  }

  private async syncStudents(branchId: string, dto: UpsertLeagueBranchDto) {
    await this.prisma.student.updateMany({
      where: {
        grade: dto.grade,
        major: dto.major,
        className: dto.className
      },
      data: {
        leagueBranchId: branchId
      }
    });
  }

  private assertCanManageAll(currentUser: AuthUser) {
    if (this.hasAnyRole(currentUser, ["admin", "teacher"])) {
      return;
    }
    throw new ForbiddenException("仅管理员或教师可以新增班团组织。");
  }

  private assertCanManageBranch(
    branch: { maintainedById: string | null },
    currentUser: AuthUser
  ) {
    if (this.hasAnyRole(currentUser, ["admin", "teacher"])) {
      return;
    }
    if (currentUser.roles.includes("league_secretary") && branch.maintainedById === currentUser.id) {
      return;
    }
    throw new ForbiddenException("无权维护该班团组织。");
  }

  private async log(
    action: string,
    targetId: string,
    dto: UpsertLeagueBranchDto,
    currentUser: AuthUser
  ) {
    await this.logsService.createOperationLog({
      action,
      targetType: "LeagueBranch",
      targetId,
      operatorId: currentUser.id,
      detail: {
        name: dto.name,
        grade: dto.grade,
        major: dto.major,
        className: dto.className
      }
    });
  }

  private hasAnyRole(currentUser: AuthUser, roles: string[]) {
    const allowed = new Set(roles);
    return currentUser.roles.some((role) => allowed.has(role));
  }
}

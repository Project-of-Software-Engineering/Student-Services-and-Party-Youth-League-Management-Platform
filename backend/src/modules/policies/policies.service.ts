import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PolicyStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { FilesService, UploadedFilePayload } from "../files/files.service";
import { LogsService } from "../logs/logs.service";
import { CreatePolicyDocDto } from "./dto/create-policy-doc.dto";
import { PolicyDocResponseDto } from "./dto/policy-doc-response.dto";
import { UpdatePolicyDocDto } from "./dto/update-policy-doc.dto";

@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly logsService: LogsService
  ) {}

  async findAll(filters: {
    category?: string;
    keyword?: string;
    includeInactive?: boolean;
  }): Promise<PolicyDocResponseDto[]> {
    const where: Prisma.PolicyDocWhereInput = {
      ...(filters.includeInactive ? {} : { status: PolicyStatus.ACTIVE }),
      ...(filters.category ? { category: { equals: filters.category, mode: "insensitive" } } : {}),
      ...(filters.keyword
        ? {
            OR: [
              { title: { contains: filters.keyword, mode: "insensitive" } },
              { category: { contains: filters.keyword, mode: "insensitive" } },
              { version: { contains: filters.keyword, mode: "insensitive" } },
              { sourceFileName: { contains: filters.keyword, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const docs = await this.prisma.policyDoc.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    });

    return docs.map((doc) => this.toResponse(doc));
  }

  async answerQuestion(question: string) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return {
        answer: "请输入政策关键词、分类或文档标题，以便为你检索相关内容。",
        matches: [],
        sources: []
      };
    }

    const matches = await this.findAll({ keyword: trimmedQuestion });

    if (matches.length === 0) {
      return {
        answer: `未检索到与“${trimmedQuestion}”相关的政策文档。可尝试使用“奖助、党团、日常管理”等分类关键词。`,
        matches: [],
        sources: []
      };
    }

    const topMatches = matches.slice(0, 3);
    return {
      answer: `基于政策知识库检索到 ${matches.length} 条相关依据，优先阅读：${topMatches.map((item) => `${item.title}（${item.version}）`).join("、")}。`,
      matches: topMatches,
      sources: topMatches.map((item) => ({
        title: item.title,
        category: item.category,
        version: item.version,
        sourceFileName: item.sourceFileName,
        sourceFileKey: item.sourceFileKey
      }))
    };
  }

  async create(dto: CreatePolicyDocDto, currentUser: AuthUser): Promise<PolicyDocResponseDto> {
    this.assertCanManagePolicies(currentUser);

    const doc = await this.prisma.policyDoc.create({
      data: {
        title: dto.title,
        category: dto.category,
        version: dto.version,
        sourceFileKey: dto.sourceFileKey ?? `manual/${Date.now()}-${dto.title.replace(/\s+/g, "-").toLowerCase()}.md`,
        sourceFileName: dto.sourceFileName ?? `${dto.title}.md`,
        createdById: currentUser.id
      }
    });

    await this.logsService.createOperationLog({
      action: "policies.create",
      targetType: "PolicyDoc",
      targetId: doc.id,
      operatorId: currentUser.id,
      detail: {
        title: doc.title,
        category: doc.category,
        version: doc.version
      }
    });

    return this.toResponse(doc);
  }

  async createFromUpload(
    file: UploadedFilePayload | undefined,
    dto: CreatePolicyDocDto,
    currentUser: AuthUser
  ): Promise<PolicyDocResponseDto> {
    this.assertCanManagePolicies(currentUser);

    if (!file?.buffer?.length) {
      throw new BadRequestException("请上传政策文件。");
    }

    const uploaded = await this.filesService.upload(
      file,
      {
        ownerType: "policy",
        ownerId: "unassigned"
      },
      currentUser
    );

    const doc = await this.prisma.policyDoc.create({
      data: {
        title: dto.title,
        category: dto.category,
        version: dto.version,
        sourceFileKey: uploaded.id,
        sourceFileName: dto.sourceFileName?.trim() || uploaded.fileName,
        createdById: currentUser.id
      }
    });

    await this.logsService.createOperationLog({
      action: "policies.upload",
      targetType: "PolicyDoc",
      targetId: doc.id,
      operatorId: currentUser.id,
      detail: {
        title: doc.title,
        category: doc.category,
        version: doc.version,
        sourceFileName: doc.sourceFileName,
        attachmentId: uploaded.id,
        fileSize: uploaded.fileSize
      }
    });

    return this.toResponse(doc);
  }

  async update(
    id: string,
    dto: UpdatePolicyDocDto,
    currentUser: AuthUser
  ): Promise<PolicyDocResponseDto> {
    this.assertCanManagePolicies(currentUser);

    const existing = await this.prisma.policyDoc.findUnique({
      where: {
        id
      }
    });

    if (!existing) {
      throw new NotFoundException("政策文档不存在。");
    }

    const doc = await this.prisma.policyDoc.update({
      where: {
        id
      },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.version !== undefined ? { version: dto.version } : {}),
        ...(dto.sourceFileKey !== undefined ? { sourceFileKey: dto.sourceFileKey } : {}),
        ...(dto.sourceFileName !== undefined ? { sourceFileName: dto.sourceFileName } : {})
      }
    });

    await this.logsService.createOperationLog({
      action: "policies.update",
      targetType: "PolicyDoc",
      targetId: doc.id,
      operatorId: currentUser.id,
      detail: {
        title: doc.title,
        category: doc.category,
        version: doc.version,
        sourceFileName: doc.sourceFileName
      }
    });

    return this.toResponse(doc);
  }

  async setStatus(
    id: string,
    status: PolicyStatus,
    currentUser: AuthUser
  ): Promise<PolicyDocResponseDto> {
    this.assertCanManagePolicies(currentUser);

    const existing = await this.prisma.policyDoc.findUnique({
      where: {
        id
      }
    });

    if (!existing) {
      throw new NotFoundException("政策文档不存在。");
    }

    const doc = await this.prisma.policyDoc.update({
      where: {
        id
      },
      data: {
        status
      }
    });

    await this.logsService.createOperationLog({
      action: status === PolicyStatus.ACTIVE ? "policies.activate" : "policies.deactivate",
      targetType: "PolicyDoc",
      targetId: doc.id,
      operatorId: currentUser.id,
      detail: {
        title: doc.title,
        category: doc.category,
        version: doc.version,
        status: doc.status
      }
    });

    return this.toResponse(doc);
  }

  canManagePolicies(currentUser: AuthUser) {
    const allowedRoles = new Set(["admin", "teacher", "leader"]);
    return currentUser.roles.some((role) => allowedRoles.has(role));
  }

  private assertCanManagePolicies(currentUser: AuthUser) {
    if (!this.canManagePolicies(currentUser)) {
      throw new ForbiddenException("仅管理员、教师或领导角色可以维护政策文档。");
    }
  }

  private toResponse(doc: {
    id: string;
    title: string;
    category: string;
    version: string;
    sourceFileKey: string;
    sourceFileName: string;
    status: PolicyStatus;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PolicyDocResponseDto {
    return {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      version: doc.version,
      sourceFileKey: doc.sourceFileKey,
      sourceFileName: doc.sourceFileName,
      status: doc.status,
      createdById: doc.createdById,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }
}

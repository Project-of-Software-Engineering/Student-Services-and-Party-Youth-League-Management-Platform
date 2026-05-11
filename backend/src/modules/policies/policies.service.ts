import { ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { LogsService } from "../logs/logs.service";
import { CreatePolicyDocDto } from "./dto/create-policy-doc.dto";
import { PolicyDocResponseDto } from "./dto/policy-doc-response.dto";

@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService
  ) {}

  async findAll(filters: { category?: string; keyword?: string }): Promise<PolicyDocResponseDto[]> {
    const where: Prisma.PolicyDocWhereInput = {
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
        matches: []
      };
    }

    const matches = await this.findAll({ keyword: trimmedQuestion });

    if (matches.length === 0) {
      return {
        answer: `未检索到与“${trimmedQuestion}”相关的政策文档。可尝试使用“奖助、党团、日常管理”等分类关键词。`,
        matches: []
      };
    }

    const topMatches = matches.slice(0, 3);
    return {
      answer: `共检索到 ${matches.length} 条相关政策，优先阅读：${topMatches.map((item) => `${item.title}（${item.version}）`).join("、")}。`,
      matches: topMatches
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

  private assertCanManagePolicies(currentUser: AuthUser) {
    const allowedRoles = new Set(["admin", "teacher", "leader"]);
    if (!currentUser.roles.some((role) => allowedRoles.has(role))) {
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
      createdById: doc.createdById,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }
}

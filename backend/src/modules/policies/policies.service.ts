import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PolicyStatus, Prisma } from "@prisma/client";
import * as ExcelJS from "exceljs";
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
              { sourceFileName: { contains: filters.keyword, mode: "insensitive" } },
              { contentText: { contains: filters.keyword, mode: "insensitive" } }
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

    const docs = await this.prisma.policyDoc.findMany({
      where: {
        status: PolicyStatus.ACTIVE
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    });

    const terms = this.extractSearchTerms(trimmedQuestion);
    const matches = docs
      .map((doc) => ({
        doc,
        score: this.scorePolicyDoc(doc, trimmedQuestion, terms)
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((item) => item.doc);

    if (matches.length === 0) {
      return {
        answer: `未检索到与“${trimmedQuestion}”相关的政策文档。可尝试使用“奖助、党团、日常管理”等分类关键词。`,
        matches: [],
        sources: []
      };
    }

    const topMatches = matches.slice(0, 3);
    return {
      answer: `根据政策知识库匹配到 ${matches.length} 条相关依据。建议优先查看：${topMatches.map((item) => `${item.title}（${item.version}）`).join("、")}。${this.buildGuidanceSentence(topMatches, terms)}`,
      matches: topMatches.map((item) => ({
        ...this.toResponse(item),
        excerpt: this.buildExcerpt(item.contentText, terms),
        matchedKeywords: terms.filter((term) => this.normalizeSearchText(this.policySearchText(item)).includes(term))
      })),
      sources: topMatches.map((item) => ({
        title: item.title,
        category: item.category,
        version: item.version,
        sourceFileName: item.sourceFileName,
        sourceFileKey: item.sourceFileKey,
        excerpt: this.buildExcerpt(item.contentText, terms)
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
        contentText: this.normalizeContentText(dto.contentText),
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
        version: doc.version,
        hasContentText: Boolean(doc.contentText)
      }
    });

    return this.toResponse(doc);
  }

  async exportPolicies(currentUser: AuthUser): Promise<Buffer> {
    this.assertCanManagePolicies(currentUser);

    const docs = await this.prisma.policyDoc.findMany({
      orderBy: [{ category: "asc" }, { title: "asc" }, { updatedAt: "desc" }]
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Student Services Platform";
    workbook.created = new Date();
    workbook.modified = new Date();
    const worksheet = workbook.addWorksheet("政策台账");
    worksheet.columns = [
      { header: "标题", key: "title", width: 28 },
      { header: "分类", key: "category", width: 18 },
      { header: "版本", key: "version", width: 14 },
      { header: "状态", key: "status", width: 12 },
      { header: "来源文件", key: "sourceFileName", width: 30 },
      { header: "正文摘要/政策要点", key: "contentText", width: 60 },
      { header: "更新时间", key: "updatedAt", width: 22 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF9D0000" }
    };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.properties.defaultRowHeight = 22;

    for (const doc of docs) {
      worksheet.addRow({
        title: doc.title,
        category: doc.category,
        version: doc.version,
        status: doc.status === PolicyStatus.ACTIVE ? "启用中" : "已停用",
        sourceFileName: doc.sourceFileName,
        contentText: doc.contentText ?? "",
        updatedAt: doc.updatedAt.toISOString()
      });
    }

    await this.logsService.createOperationLog({
      action: "policies.export",
      targetType: "PolicyDoc",
      operatorId: currentUser.id,
      detail: {
        fileName: "policies-export.xlsx",
        rows: docs.length
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
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
        contentText: this.normalizeContentText(dto.contentText) ?? this.extractTextFromUpload(file),
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
        fileSize: uploaded.fileSize,
        hasContentText: Boolean(doc.contentText)
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
        ...(dto.sourceFileName !== undefined ? { sourceFileName: dto.sourceFileName } : {}),
        ...(dto.contentText !== undefined ? { contentText: this.normalizeContentText(dto.contentText) } : {})
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
        sourceFileName: doc.sourceFileName,
        hasContentText: Boolean(doc.contentText)
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

  private normalizeContentText(contentText?: string | null): string | null {
    const normalized = contentText?.replace(/\r\n/g, "\n").trim();
    if (!normalized) {
      return null;
    }
    return normalized.slice(0, 10000);
  }

  private extractTextFromUpload(file: UploadedFilePayload): string | null {
    if (!["text/plain", "text/markdown"].includes(file.mimetype)) {
      return null;
    }
    return this.normalizeContentText(file.buffer.toString("utf8"));
  }

  private extractSearchTerms(question: string): string[] {
    const normalizedQuestion = this.normalizeSearchText(question);
    const baseTerms = normalizedQuestion
      .split(/[\s,.;:!?，。；：！？、（）()[\]{}"'“”‘’《》<>/\\|+-]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2);

    const aliases: Record<string, string[]> = {
      奖学金: ["奖学金", "奖助", "评审", "资助"],
      助学金: ["助学金", "奖助", "困难", "资助"],
      入党: ["入党", "党员", "积极分子", "发展对象"],
      党员: ["党员", "入党", "党团", "发展"],
      团员: ["团员", "团学", "党团", "活动"],
      请假: ["请假", "考勤", "签到", "缺勤"],
      考勤: ["考勤", "签到", "请假", "活动"]
    };

    const expanded = new Set(baseTerms.length > 0 ? baseTerms : [normalizedQuestion]);
    for (const [keyword, values] of Object.entries(aliases)) {
      if (normalizedQuestion.includes(keyword)) {
        values.forEach((value) => expanded.add(this.normalizeSearchText(value)));
      }
    }
    return Array.from(expanded).filter(Boolean);
  }

  private scorePolicyDoc(
    doc: {
      title: string;
      category: string;
      version: string;
      sourceFileName: string;
      contentText: string | null;
    },
    question: string,
    terms: string[]
  ): number {
    const normalizedQuestion = this.normalizeSearchText(question);
    const title = this.normalizeSearchText(doc.title);
    const category = this.normalizeSearchText(doc.category);
    const version = this.normalizeSearchText(doc.version);
    const sourceFileName = this.normalizeSearchText(doc.sourceFileName);
    const contentText = this.normalizeSearchText(doc.contentText ?? "");
    let score = 0;

    if (this.policySearchText(doc).includes(normalizedQuestion)) {
      score += 20;
    }

    for (const term of terms) {
      if (title.includes(term)) score += 10;
      if (category.includes(term)) score += 6;
      if (sourceFileName.includes(term)) score += 4;
      if (version.includes(term)) score += 2;
      if (contentText.includes(term)) score += 5;
    }
    return score;
  }

  private buildGuidanceSentence(
    docs: Array<{ contentText: string | null }>,
    terms: string[]
  ): string {
    const excerpt = docs.map((doc) => this.buildExcerpt(doc.contentText, terms)).find(Boolean);
    return excerpt ? ` 摘要提示：${excerpt}` : "";
  }

  private buildExcerpt(contentText: string | null, terms: string[]): string {
    const content = this.normalizeContentText(contentText);
    if (!content) {
      return "";
    }

    const normalizedContent = this.normalizeSearchText(content);
    const firstIndex = terms.reduce((current, term) => {
      const index = normalizedContent.indexOf(term);
      if (index < 0) {
        return current;
      }
      return current < 0 ? index : Math.min(current, index);
    }, -1);

    const start = Math.max(firstIndex < 0 ? 0 : firstIndex - 45, 0);
    const excerpt = content.slice(start, start + 140).replace(/\s+/g, " ").trim();
    return `${start > 0 ? "..." : ""}${excerpt}${start + 140 < content.length ? "..." : ""}`;
  }

  private policySearchText(doc: {
    title: string;
    category: string;
    version: string;
    sourceFileName: string;
    contentText: string | null;
  }): string {
    return this.normalizeSearchText(
      [doc.title, doc.category, doc.version, doc.sourceFileName, doc.contentText ?? ""].join(" ")
    );
  }

  private normalizeSearchText(value: string): string {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
  }

  private toResponse(doc: {
    id: string;
    title: string;
    category: string;
    version: string;
    sourceFileKey: string;
    sourceFileName: string;
    contentText: string | null;
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
      contentText: doc.contentText,
      status: doc.status,
      createdById: doc.createdById,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }
}

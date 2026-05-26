import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { LogsService } from "../logs/logs.service";
import { CreateBusinessTemplateDto, UpdateBusinessTemplateDto } from "./dto/business-template.dto";

@Injectable()
export class BusinessTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService
  ) {}

  async findAll(filters: { includeDisabled?: boolean }) {
    const templates = await this.prisma.businessTemplate.findMany({
      where: filters.includeDisabled ? {} : { enabled: true },
      orderBy: [{ category: "asc" }, { businessType: "asc" }, { updatedAt: "desc" }]
    });

    return templates.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }));
  }

  async create(dto: CreateBusinessTemplateDto, currentUser: AuthUser) {
    this.assertCanManage(currentUser);
    const fileName = await this.resolveFileName(dto.fileAttachmentId, dto.fileName);
    const template = await this.prisma.businessTemplate.create({
      data: {
        name: dto.name,
        category: dto.category,
        businessType: dto.businessType,
        description: dto.description ?? null,
        fileAttachmentId: dto.fileAttachmentId ?? null,
        fileName,
        content: dto.content ?? null,
        createdById: currentUser.id
      }
    });
    await this.log("business_templates.create", template.id, template.name, currentUser);
    return template;
  }

  async update(id: string, dto: UpdateBusinessTemplateDto, currentUser: AuthUser) {
    this.assertCanManage(currentUser);
    const existing = await this.prisma.businessTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("业务模板不存在。");
    }

    const fileName = await this.resolveFileName(dto.fileAttachmentId, dto.fileName);
    const template = await this.prisma.businessTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        businessType: dto.businessType,
        description: dto.description ?? null,
        fileAttachmentId: dto.fileAttachmentId ?? null,
        fileName,
        content: dto.content ?? null,
        enabled: dto.enabled ?? existing.enabled
      }
    });
    await this.log("business_templates.update", id, template.name, currentUser);
    return template;
  }

  async setEnabled(id: string, enabled: boolean, currentUser: AuthUser) {
    this.assertCanManage(currentUser);
    const template = await this.prisma.businessTemplate.update({
      where: { id },
      data: { enabled }
    });
    await this.log(enabled ? "business_templates.enable" : "business_templates.disable", id, template.name, currentUser);
    return template;
  }

  private async resolveFileName(fileAttachmentId?: string, fallback?: string) {
    if (!fileAttachmentId) {
      return fallback?.trim() || null;
    }
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: fileAttachmentId }
    });
    if (!attachment) {
      throw new BadRequestException("关联附件不存在。");
    }
    return fallback?.trim() || attachment.fileName;
  }

  private assertCanManage(currentUser: AuthUser) {
    if (currentUser.roles.some((role) => ["admin", "teacher"].includes(role))) {
      return;
    }
    throw new ForbiddenException("仅管理员或教师可以维护业务模板。");
  }

  private async log(action: string, targetId: string, name: string, currentUser: AuthUser) {
    await this.logsService.createOperationLog({
      action,
      targetType: "BusinessTemplate",
      targetId,
      operatorId: currentUser.id,
      detail: { name }
    });
  }
}

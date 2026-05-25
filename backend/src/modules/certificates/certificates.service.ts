import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateTemplateDto, GenerateCertificateDto } from "./dto/certificate.dto";
import { LogsService } from "../logs/logs.service";

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  async createTemplate(dto: CreateTemplateDto, userId?: string) {
    const template = await this.prisma.certificateTemplate.create({
      data: {
        name: dto.name,
        type: dto.type,
        content: dto.content,
        fields: dto.fields,
        createdById: userId,
      },
    });
    await this.logsService.createOperationLog({
      action: "certificates.template.create",
      targetType: "CertificateTemplate",
      targetId: template.id,
      operatorId: userId,
      detail: { name: dto.name, type: dto.type },
    });
    return template;
  }

  findAllTemplates() {
    return this.prisma.certificateTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  findTemplateById(id: string) {
    return this.prisma.certificateTemplate.findUnique({ where: { id } });
  }

  async generate(dto: GenerateCertificateDto, userId?: string) {
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id: dto.templateId },
    });
    if (!template) throw new NotFoundException("证明模板不存在");

    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException("学生不存在");

    const certNo = await this.generateCertNo(template.type);
    let content = template.content;
    content = content.replace(/\{\{studentName\}\}/g, student.name);
    content = content.replace(/\{\{studentNo\}\}/g, student.studentNo);
    content = content.replace(/\{\{grade\}\}/g, student.grade);
    content = content.replace(/\{\{major\}\}/g, student.major);
    content = content.replace(/\{\{className\}\}/g, student.className);
    content = content.replace(/\{\{certNo\}\}/g, certNo);
    content = content.replace(/\{\{date\}\}/g, new Date().toLocaleDateString("zh-CN"));

    if (dto.fieldValues) {
      for (const [key, value] of Object.entries(dto.fieldValues)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      }
    }

    const cert = await this.prisma.certificate.create({
      data: {
        certNo,
        templateId: template.id,
        studentId: student.id,
        studentName: student.name,
        studentNo: student.studentNo,
        title: template.name,
        content,
        fieldValues: dto.fieldValues ?? {},
        issuedById: userId,
      },
    });

    await this.logsService.createOperationLog({
      action: "certificates.generate",
      targetType: "Certificate",
      targetId: cert.id,
      operatorId: userId,
      detail: { certNo, studentName: student.name, template: template.name },
    });

    return cert;
  }

  findAll() {
    return this.prisma.certificate.findMany({
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });
  }

  findByStudent(studentId: string) {
    return this.prisma.certificate.findMany({
      where: { studentId },
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { id },
      include: { template: true },
    });
    if (!cert) throw new NotFoundException("证明不存在");
    return cert;
  }

  async revoke(id: string, userId?: string) {
    const cert = await this.prisma.certificate.update({
      where: { id },
      data: { status: "REVOKED" },
    });
    await this.logsService.createOperationLog({
      action: "certificates.revoke",
      targetType: "Certificate",
      targetId: cert.id,
      operatorId: userId,
      detail: { certNo: cert.certNo },
    });
    return cert;
  }

  private async generateCertNo(type: string): Promise<string> {
    const prefix = type.toUpperCase().slice(0, 4);
    const year = new Date().getFullYear();
    const count = await this.prisma.certificate.count({
      where: { certNo: { startsWith: `${prefix}-${year}-` } },
    });
    const seq = String(count + 1).padStart(4, "0");
    return `${prefix}-${year}-${seq}`;
  }
}

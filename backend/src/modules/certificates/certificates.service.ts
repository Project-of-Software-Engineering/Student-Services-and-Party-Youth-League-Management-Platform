import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateTemplateDto, GenerateCertificateDto } from "./dto/certificate.dto";
import { LogsService } from "../logs/logs.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  async createTemplate(dto: CreateTemplateDto, currentUser: AuthUser) {
    this.assertCanManageCertificates(currentUser);

    const template = await this.prisma.certificateTemplate.create({
      data: {
        name: dto.name,
        type: dto.type,
        content: dto.content,
        fields: dto.fields,
        createdById: currentUser.id,
      },
    });
    await this.logsService.createOperationLog({
      action: "certificates.template.create",
      targetType: "CertificateTemplate",
      targetId: template.id,
      operatorId: currentUser.id,
      detail: { name: dto.name, type: dto.type },
    });
    return template;
  }

  findAllTemplates(currentUser: AuthUser) {
    this.assertCanManageCertificates(currentUser);

    return this.prisma.certificateTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  findTemplateById(id: string, currentUser: AuthUser) {
    this.assertCanManageCertificates(currentUser);

    return this.prisma.certificateTemplate.findUnique({ where: { id } });
  }

  async generate(dto: GenerateCertificateDto, currentUser: AuthUser) {
    this.assertCanManageCertificates(currentUser);

    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id: dto.templateId },
    });
    if (!template) throw new NotFoundException("证明模板不存在");

    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException("学生不存在");

    const cert = await this.createCertificateWithRetry(template, student, dto, currentUser.id);

    await this.logsService.createOperationLog({
      action: "certificates.generate",
      targetType: "Certificate",
      targetId: cert.id,
      operatorId: currentUser.id,
      detail: { certNo: cert.certNo, studentName: student.name, template: template.name },
    });

    return cert;
  }

  findAll(currentUser: AuthUser) {
    this.assertCanManageCertificates(currentUser);

    return this.prisma.certificate.findMany({
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByStudent(studentId: string, currentUser: AuthUser) {
    await this.assertCanViewStudentCertificates(studentId, currentUser);

    return this.prisma.certificate.findMany({
      where: { studentId },
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, currentUser: AuthUser) {
    const cert = await this.prisma.certificate.findUnique({
      where: { id },
      include: { template: true },
    });
    if (!cert) throw new NotFoundException("证明不存在");
    await this.assertCanViewStudentCertificates(cert.studentId, currentUser);
    return cert;
  }

  async revoke(id: string, currentUser: AuthUser) {
    this.assertCanManageCertificates(currentUser);

    const cert = await this.prisma.certificate.update({
      where: { id },
      data: { status: "REVOKED" },
    });
    await this.logsService.createOperationLog({
      action: "certificates.revoke",
      targetType: "Certificate",
      targetId: cert.id,
      operatorId: currentUser.id,
      detail: { certNo: cert.certNo },
    });
    return cert;
  }

  private async createCertificateWithRetry(
    template: { id: string; name: string; type: string; content: string },
    student: {
      id: string;
      name: string;
      studentNo: string;
      grade: string;
      major: string;
      className: string;
    },
    dto: GenerateCertificateDto,
    userId: string
  ) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const certNo = await this.generateCertNo(template.type);
      const content = this.renderContent(template.content, student, certNo, dto.fieldValues);

      try {
        return await this.prisma.certificate.create({
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
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          attempt < 4
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new Error("证明编号生成失败，请稍后重试。");
  }

  private renderContent(
    templateContent: string,
    student: {
      name: string;
      studentNo: string;
      grade: string;
      major: string;
      className: string;
    },
    certNo: string,
    fieldValues: Record<string, string> | undefined
  ): string {
    let content = templateContent;
    const builtinValues: Record<string, string> = {
      studentName: student.name,
      studentNo: student.studentNo,
      grade: student.grade,
      major: student.major,
      className: student.className,
      certNo,
      date: new Date().toLocaleDateString("zh-CN")
    };

    for (const [key, value] of Object.entries({ ...builtinValues, ...(fieldValues ?? {}) })) {
      content = content.replace(
        new RegExp(`\\{\\{${this.escapeRegExp(key)}\\}\\}`, "g"),
        String(value)
      );
    }

    return content;
  }

  private async assertCanViewStudentCertificates(studentId: string, currentUser: AuthUser) {
    if (this.canManageCertificates(currentUser)) {
      return;
    }

    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        userId: currentUser.id
      },
      select: {
        id: true
      }
    });

    if (!student) {
      throw new ForbiddenException("无权查看该学生的电子证明。");
    }
  }

  private assertCanManageCertificates(currentUser: AuthUser) {
    if (!this.canManageCertificates(currentUser)) {
      throw new ForbiddenException("仅管理员或教师可以维护电子证明。");
    }
  }

  private canManageCertificates(currentUser: AuthUser): boolean {
    const allowedRoles = new Set(["admin", "teacher"]);
    return currentUser.roles.some((role) => allowedRoles.has(role));
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

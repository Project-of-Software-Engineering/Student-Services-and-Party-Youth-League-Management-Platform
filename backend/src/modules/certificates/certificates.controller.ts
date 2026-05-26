import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { CertificatesService } from "./certificates.service";
import { CreateTemplateDto, GenerateCertificateDto } from "./dto/certificate.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("certificates")
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post("templates")
  @Roles("admin", "teacher")
  createTemplate(@Body() dto: CreateTemplateDto, @CurrentUser() user: AuthUser) {
    return this.certificatesService.createTemplate(dto, user);
  }

  @Get("templates")
  @Roles("admin", "teacher")
  findAllTemplates(@CurrentUser() user: AuthUser) {
    return this.certificatesService.findAllTemplates(user);
  }

  @Get("templates/:id")
  @Roles("admin", "teacher")
  findTemplate(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.certificatesService.findTemplateById(id, user);
  }

  @Post("generate")
  @Roles("admin", "teacher")
  generate(@Body() dto: GenerateCertificateDto, @CurrentUser() user: AuthUser) {
    return this.certificatesService.generate(dto, user);
  }

  @Get()
  @Roles("admin", "teacher")
  findAll(@CurrentUser() user: AuthUser) {
    return this.certificatesService.findAll(user);
  }

  @Get("student/:studentId")
  @Roles("admin", "teacher", "student")
  findByStudent(@Param("studentId") studentId: string, @CurrentUser() user: AuthUser) {
    return this.certificatesService.findByStudent(studentId, user);
  }

  @Get(":id")
  @Roles("admin", "teacher", "student")
  findById(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.certificatesService.findById(id, user);
  }

  @Post(":id/revoke")
  @Roles("admin", "teacher")
  revoke(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.certificatesService.revoke(id, user);
  }
}

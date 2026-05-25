import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CertificatesService } from "./certificates.service";
import { CreateTemplateDto, GenerateCertificateDto } from "./dto/certificate.dto";

@UseGuards(JwtAuthGuard)
@Controller("certificates")
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post("templates")
  createTemplate(@Body() dto: CreateTemplateDto, @CurrentUser() user: any) {
    return this.certificatesService.createTemplate(dto, user?.id);
  }

  @Get("templates")
  findAllTemplates() {
    return this.certificatesService.findAllTemplates();
  }

  @Get("templates/:id")
  findTemplate(@Param("id") id: string) {
    return this.certificatesService.findTemplateById(id);
  }

  @Post("generate")
  generate(@Body() dto: GenerateCertificateDto, @CurrentUser() user: any) {
    return this.certificatesService.generate(dto, user?.id);
  }

  @Get()
  findAll() {
    return this.certificatesService.findAll();
  }

  @Get("student/:studentId")
  findByStudent(@Param("studentId") studentId: string) {
    return this.certificatesService.findByStudent(studentId);
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.certificatesService.findById(id);
  }

  @Post(":id/revoke")
  revoke(@Param("id") id: string, @CurrentUser() user: any) {
    return this.certificatesService.revoke(id, user?.id);
  }
}

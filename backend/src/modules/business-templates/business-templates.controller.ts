import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { BusinessTemplatesService } from "./business-templates.service";
import { CreateBusinessTemplateDto, UpdateBusinessTemplateDto } from "./dto/business-template.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("business-templates")
export class BusinessTemplatesController {
  constructor(private readonly businessTemplatesService: BusinessTemplatesService) {}

  @Get()
  @Roles("admin", "teacher", "leader", "student", "league_secretary")
  findAll(@Query("includeDisabled") includeDisabled?: string) {
    return this.businessTemplatesService.findAll({ includeDisabled: includeDisabled === "true" });
  }

  @Post()
  @Roles("admin", "teacher")
  create(@Body() dto: CreateBusinessTemplateDto, @CurrentUser() currentUser: AuthUser) {
    return this.businessTemplatesService.create(dto, currentUser);
  }

  @Patch(":id")
  @Roles("admin", "teacher")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateBusinessTemplateDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.businessTemplatesService.update(id, dto, currentUser);
  }

  @Post(":id/enable")
  @Roles("admin", "teacher")
  enable(@Param("id") id: string, @CurrentUser() currentUser: AuthUser) {
    return this.businessTemplatesService.setEnabled(id, true, currentUser);
  }

  @Post(":id/disable")
  @Roles("admin", "teacher")
  disable(@Param("id") id: string, @CurrentUser() currentUser: AuthUser) {
    return this.businessTemplatesService.setEnabled(id, false, currentUser);
  }
}

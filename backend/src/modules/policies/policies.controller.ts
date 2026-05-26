import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PolicyStatus } from "@prisma/client";
import { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  UploadedFilePayload
} from "../files/files.service";
import { CreatePolicyDocDto } from "./dto/create-policy-doc.dto";
import { UpdatePolicyDocDto } from "./dto/update-policy-doc.dto";
import { PoliciesService } from "./policies.service";

const policyFileUploadOptions = {
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
    files: 1,
    fields: 5,
    fieldSize: 12000
  },
  fileFilter: (
    _request: unknown,
    file: UploadedFilePayload,
    callback: (error: Error | null, acceptFile: boolean) => void
  ) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      callback(new BadRequestException("仅支持 PDF、Word、Excel、图片和纯文本政策附件。"), false);
      return;
    }

    callback(null, true);
  }
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("policies")
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthUser,
    @Query("category") category?: string,
    @Query("keyword") keyword?: string,
    @Query("includeInactive") includeInactive?: string
  ) {
    return this.policiesService.findAll({
      category,
      keyword,
      includeInactive: includeInactive === "true" && this.policiesService.canManagePolicies(currentUser)
    });
  }

  @Get("ask")
  ask(@Query("q") question?: string) {
    return this.policiesService.answerQuestion(question ?? "");
  }

  @Get("export")
  @Roles("admin", "teacher", "leader")
  async exportPolicies(
    @CurrentUser() currentUser: AuthUser,
    @Res({ passthrough: true }) response: Response
  ): Promise<StreamableFile> {
    const file = await this.policiesService.exportPolicies(currentUser);
    response.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Length": file.length,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("policies-export.xlsx")}`
    });
    return new StreamableFile(file);
  }

  @Post()
  @Roles("admin", "teacher", "leader")
  create(@Body() dto: CreatePolicyDocDto, @CurrentUser() currentUser: AuthUser) {
    return this.policiesService.create(dto, currentUser);
  }

  @Post("upload")
  @Roles("admin", "teacher", "leader")
  @UseInterceptors(FileInterceptor("file", policyFileUploadOptions))
  uploadPolicyFile(
    @UploadedFile() file: UploadedFilePayload,
    @Body() dto: CreatePolicyDocDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.policiesService.createFromUpload(file, dto, currentUser);
  }

  @Patch(":id")
  @Roles("admin", "teacher", "leader")
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePolicyDocDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.policiesService.update(id, dto, currentUser);
  }

  @Post(":id/activate")
  @Roles("admin", "teacher", "leader")
  activate(@Param("id") id: string, @CurrentUser() currentUser: AuthUser) {
    return this.policiesService.setStatus(id, PolicyStatus.ACTIVE, currentUser);
  }

  @Post(":id/deactivate")
  @Roles("admin", "teacher", "leader")
  deactivate(@Param("id") id: string, @CurrentUser() currentUser: AuthUser) {
    return this.policiesService.setStatus(id, PolicyStatus.INACTIVE, currentUser);
  }
}

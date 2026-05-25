import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PolicyStatus } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
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
    fields: 4,
    fieldSize: 512
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

@UseGuards(JwtAuthGuard)
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

  @Post()
  create(@Body() dto: CreatePolicyDocDto, @CurrentUser() currentUser: AuthUser) {
    return this.policiesService.create(dto, currentUser);
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", policyFileUploadOptions))
  uploadPolicyFile(
    @UploadedFile() file: UploadedFilePayload,
    @Body() dto: CreatePolicyDocDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.policiesService.createFromUpload(file, dto, currentUser);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePolicyDocDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.policiesService.update(id, dto, currentUser);
  }

  @Post(":id/activate")
  activate(@Param("id") id: string, @CurrentUser() currentUser: AuthUser) {
    return this.policiesService.setStatus(id, PolicyStatus.ACTIVE, currentUser);
  }

  @Post(":id/deactivate")
  deactivate(@Param("id") id: string, @CurrentUser() currentUser: AuthUser) {
    return this.policiesService.setStatus(id, PolicyStatus.INACTIVE, currentUser);
  }
}

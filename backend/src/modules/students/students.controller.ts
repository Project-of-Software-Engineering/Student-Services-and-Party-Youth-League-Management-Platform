import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ProfileChangeStatus } from "@prisma/client";
import { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { MAX_UPLOAD_FILE_SIZE_BYTES, UploadedFilePayload } from "../files/files.service";
import { ImportStudentsDto } from "./dto/import-students.dto";
import {
  ReviewProfileChangeRequestDto,
  SubmitProfileChangeRequestDto
} from "./dto/profile-change-request.dto";
import { StudentsService } from "./students.service";

const EXCEL_IMPORT_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);

const excelImportOptions = {
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
    files: 1
  },
  fileFilter: (
    _request: unknown,
    file: UploadedFilePayload,
    callback: (error: Error | null, acceptFile: boolean) => void
  ) => {
    if (!EXCEL_IMPORT_MIME_TYPES.has(file.mimetype)) {
      callback(new BadRequestException("仅支持 .xlsx 学生导入文件。"), false);
      return;
    }

    callback(null, true);
  }
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @Roles("admin", "teacher")
  findAll(@CurrentUser() currentUser: AuthUser) {
    return this.studentsService.findAll(currentUser);
  }

  @Get("import-template")
  @Roles("admin", "teacher")
  async downloadImportTemplate(
    @CurrentUser() currentUser: AuthUser,
    @Res({ passthrough: true }) response: Response
  ): Promise<StreamableFile> {
    const file = await this.studentsService.buildImportTemplate(currentUser);
    this.setExcelDownloadHeaders(response, "students-import-template.xlsx", file.length);
    return new StreamableFile(file);
  }

  @Get("export")
  @Roles("admin", "teacher")
  async exportStudents(
    @CurrentUser() currentUser: AuthUser,
    @Res({ passthrough: true }) response: Response
  ): Promise<StreamableFile> {
    const file = await this.studentsService.exportStudents(currentUser);
    this.setExcelDownloadHeaders(response, "students-export.xlsx", file.length);
    return new StreamableFile(file);
  }

  @Get("me")
  findMine(@CurrentUser() currentUser: AuthUser) {
    return this.studentsService.findByUserId(currentUser.id);
  }

  @Get("me/profile")
  findMyProfile(@CurrentUser() currentUser: AuthUser) {
    return this.studentsService.findProfileByUserId(currentUser.id);
  }

  @Get("me/profile-requests")
  findMyProfileChangeRequests(@CurrentUser() currentUser: AuthUser) {
    return this.studentsService.findMyProfileChangeRequests(currentUser);
  }

  @Post("me/profile-requests")
  submitMyProfileChangeRequest(
    @Body() dto: SubmitProfileChangeRequestDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.studentsService.submitProfileChangeRequest(dto, currentUser);
  }

  @Get("profile-requests")
  @Roles("admin", "teacher")
  findProfileChangeRequests(@CurrentUser() currentUser: AuthUser) {
    return this.studentsService.findProfileChangeRequests(currentUser);
  }

  @Post("profile-requests/:id/approve")
  @Roles("admin", "teacher")
  approveProfileChangeRequest(
    @Param("id") id: string,
    @Body() dto: ReviewProfileChangeRequestDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.studentsService.reviewProfileChangeRequest(
      id,
      ProfileChangeStatus.APPROVED,
      dto,
      currentUser
    );
  }

  @Post("profile-requests/:id/reject")
  @Roles("admin", "teacher")
  rejectProfileChangeRequest(
    @Param("id") id: string,
    @Body() dto: ReviewProfileChangeRequestDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.studentsService.reviewProfileChangeRequest(
      id,
      ProfileChangeStatus.REJECTED,
      dto,
      currentUser
    );
  }

  @Get(":id")
  @Roles("admin", "teacher", "student")
  findOne(@Param("id") id: string, @CurrentUser() currentUser: AuthUser) {
    return this.studentsService.findOne(id, currentUser);
  }

  @Get(":id/profile")
  @Roles("admin", "teacher", "student")
  findProfile(@Param("id") id: string, @CurrentUser() currentUser: AuthUser) {
    return this.studentsService.findProfile(id, currentUser);
  }

  @Post("import")
  @Roles("admin", "teacher")
  importStudents(@Body() dto: ImportStudentsDto, @CurrentUser() operator: AuthUser) {
    return this.studentsService.importStudents(dto, operator);
  }

  @Post("import/excel")
  @Roles("admin", "teacher")
  @UseInterceptors(FileInterceptor("file", excelImportOptions))
  importStudentsFromExcel(
    @UploadedFile() file: UploadedFilePayload,
    @CurrentUser() operator: AuthUser
  ) {
    return this.studentsService.importStudentsFromExcel(file, operator);
  }

  private setExcelDownloadHeaders(response: Response, fileName: string, fileSize: number) {
    response.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Length": fileSize,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
    });
  }
}

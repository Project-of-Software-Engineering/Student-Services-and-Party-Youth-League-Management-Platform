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
import { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { MAX_UPLOAD_FILE_SIZE_BYTES, UploadedFilePayload } from "../files/files.service";
import { ImportStudentsDto } from "./dto/import-students.dto";
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

@UseGuards(JwtAuthGuard)
@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll(@CurrentUser() currentUser: AuthUser) {
    return this.studentsService.findAll(currentUser);
  }

  @Get("import-template")
  async downloadImportTemplate(
    @CurrentUser() currentUser: AuthUser,
    @Res({ passthrough: true }) response: Response
  ): Promise<StreamableFile> {
    const file = await this.studentsService.buildImportTemplate(currentUser);
    this.setExcelDownloadHeaders(response, "students-import-template.xlsx", file.length);
    return new StreamableFile(file);
  }

  @Get("export")
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

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.studentsService.findOne(id);
  }

  @Get(":id/profile")
  findProfile(@Param("id") id: string) {
    return this.studentsService.findProfile(id);
  }

  @Post("import")
  importStudents(@Body() dto: ImportStudentsDto, @CurrentUser() operator: AuthUser) {
    return this.studentsService.importStudents(dto, operator);
  }

  @Post("import/excel")
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

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
import { FilesService, UploadedFilePayload } from "./files.service";

@UseGuards(JwtAuthGuard)
@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthUser,
    @Query("ownerType") ownerType?: string,
    @Query("ownerId") ownerId?: string
  ) {
    return this.filesService.findAll(currentUser, { ownerType, ownerId });
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @UploadedFile() file: UploadedFilePayload,
    @Body("ownerType") ownerType: string | undefined,
    @Body("ownerId") ownerId: string | undefined,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.filesService.upload(file, { ownerType, ownerId }, currentUser);
  }

  @Get(":id/download")
  async download(
    @Param("id") id: string,
    @CurrentUser() currentUser: AuthUser,
    @Res({ passthrough: true }) response: Response
  ): Promise<StreamableFile> {
    const download = await this.filesService.download(id, currentUser);
    response.set({
      "Content-Type": download.attachment.mimeType,
      "Content-Length": download.attachment.fileSize,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        download.attachment.fileName
      )}`
    });
    return new StreamableFile(download.stream);
  }
}

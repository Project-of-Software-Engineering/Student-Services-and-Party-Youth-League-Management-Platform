import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Attachment, StudentStatus } from "@prisma/client";
import { createReadStream } from "fs";
import { mkdir, stat, writeFile } from "fs/promises";
import { dirname, isAbsolute, join, normalize, relative } from "path";
import { randomUUID } from "crypto";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { LogsService } from "../logs/logs.service";
import { FileResponseDto } from "./dto/file-response.dto";

export interface UploadedFilePayload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const MAX_UPLOAD_FILE_SIZE_BYTES = 30 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain"
]);

@Injectable()
export class FilesService {
  private readonly storageDir = process.env.FILE_STORAGE_DIR ?? join(process.cwd(), "storage", "uploads");

  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService
  ) {}

  async findAll(
    currentUser: AuthUser,
    filters: { ownerType?: string; ownerId?: string }
  ): Promise<FileResponseDto[]> {
    const where = await this.buildAttachmentWhere(currentUser, filters);
    const files = await this.prisma.attachment.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    return files.map((file) => this.toResponse(file));
  }

  async upload(
    file: UploadedFilePayload | undefined,
    input: { ownerType?: string; ownerId?: string },
    currentUser: AuthUser
  ): Promise<FileResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("请上传有效附件。");
    }
    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES || file.buffer.length > MAX_UPLOAD_FILE_SIZE_BYTES) {
      throw new BadRequestException("附件大小不能超过 30MB。");
    }
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("仅支持 PDF、Word、Excel、图片和纯文本附件。");
    }

    const ownerType = input.ownerType?.trim() || "general";
    const ownerId = input.ownerId?.trim() || "unassigned";
    await this.assertCanAttach(ownerType, ownerId, currentUser);

    const safeName = this.safeFileName(file.originalname);
    const fileKey = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
    const fullPath = this.resolveFilePath(fileKey);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.buffer);

    const attachment = await this.prisma.attachment.create({
      data: {
        ownerType,
        ownerId,
        fileKey,
        fileName: safeName,
        mimeType: file.mimetype || "application/octet-stream",
        fileSize: file.size,
        uploadedBy: currentUser.id
      }
    });

    await this.logsService.createOperationLog({
      action: "files.upload",
      targetType: "Attachment",
      targetId: attachment.id,
      operatorId: currentUser.id,
      detail: {
        ownerType,
        ownerId,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize
      }
    });

    return this.toResponse(attachment);
  }

  async download(id: string, currentUser: AuthUser) {
    const attachment = await this.prisma.attachment.findUnique({
      where: {
        id
      }
    });

    if (!attachment) {
      throw new NotFoundException("附件不存在。");
    }

    await this.assertCanRead(attachment, currentUser);

    const fullPath = this.resolveFilePath(attachment.fileKey);
    try {
      await stat(fullPath);
    } catch {
      throw new NotFoundException("附件文件不存在或已被清理。");
    }

    return {
      attachment,
      stream: createReadStream(fullPath)
    };
  }

  private async buildAttachmentWhere(
    currentUser: AuthUser,
    filters: { ownerType?: string; ownerId?: string }
  ) {
    const ownerType = filters.ownerType?.trim();
    const ownerId = filters.ownerId?.trim();

    if (ownerType && ownerId) {
      await this.assertCanListOwner(ownerType, ownerId, currentUser);
      return {
        ownerType,
        ownerId
      };
    }

    if (this.isPrivilegedUser(currentUser)) {
      return {};
    }

    const ownApprovalIds = await this.findOwnApprovalIds(currentUser);
    return {
      OR: [
        {
          uploadedBy: currentUser.id
        },
        {
          ownerType: "approval",
          ownerId: {
            in: ownApprovalIds
          }
        }
      ]
    };
  }

  private async assertCanAttach(ownerType: string, ownerId: string, currentUser: AuthUser) {
    if (ownerType !== "approval" || ownerId === "unassigned") {
      return;
    }

    await this.assertCanListOwner(ownerType, ownerId, currentUser);
  }

  private async assertCanRead(attachment: Attachment, currentUser: AuthUser) {
    if (this.isPrivilegedUser(currentUser) || attachment.uploadedBy === currentUser.id) {
      return;
    }

    if (attachment.ownerType !== "approval") {
      throw new ForbiddenException("无权下载该附件。");
    }

    const canRead = await this.prisma.approval.findFirst({
      where: {
        id: attachment.ownerId,
        student: {
          userId: currentUser.id
        }
      },
      select: {
        id: true
      }
    });

    if (!canRead) {
      throw new ForbiddenException("无权下载该附件。");
    }
  }

  private async assertCanListOwner(ownerType: string, ownerId: string, currentUser: AuthUser) {
    if (this.isPrivilegedUser(currentUser)) {
      return;
    }

    if (ownerType !== "approval") {
      throw new ForbiddenException("无权查看该附件列表。");
    }

    const ownApproval = await this.prisma.approval.findFirst({
      where: {
        id: ownerId,
        student: {
          userId: currentUser.id
        }
      },
      select: {
        id: true
      }
    });

    if (!ownApproval) {
      throw new ForbiddenException("无权查看该附件列表。");
    }
  }

  private async findOwnApprovalIds(currentUser: AuthUser): Promise<string[]> {
    const student = await this.prisma.student.findUnique({
      where: {
        userId: currentUser.id
      },
      select: {
        id: true,
        status: true
      }
    });

    if (!student || student.status !== StudentStatus.ACTIVE) {
      return [];
    }

    const approvals = await this.prisma.approval.findMany({
      where: {
        studentId: student.id
      },
      select: {
        id: true
      }
    });

    return approvals.map((approval) => approval.id);
  }

  private isPrivilegedUser(currentUser: AuthUser): boolean {
    const privilegedRoles = new Set(["admin", "teacher", "leader"]);
    return currentUser.roles.some((role) => privilegedRoles.has(role));
  }

  private safeFileName(fileName: string): string {
    const cleaned = fileName.replace(/[\\/]/g, "-").replace(/\s+/g, "-").trim();
    return cleaned || "attachment.bin";
  }

  private resolveFilePath(fileKey: string): string {
    const fullPath = normalize(join(this.storageDir, fileKey));
    const normalizedStorageDir = normalize(this.storageDir);
    const relativePath = relative(normalizedStorageDir, fullPath);
    if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
      throw new BadRequestException("附件路径非法。");
    }
    return fullPath;
  }

  private toResponse(file: Attachment): FileResponseDto {
    return {
      id: file.id,
      ownerType: file.ownerType,
      ownerId: file.ownerId,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      uploadedBy: file.uploadedBy,
      createdAt: file.createdAt.toISOString(),
      downloadUrl: `/api/files/${file.id}/download`
    };
  }
}

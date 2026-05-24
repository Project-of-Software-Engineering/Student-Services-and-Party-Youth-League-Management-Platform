export class FileResponseDto {
  id!: string;
  ownerType!: string;
  ownerId!: string;
  fileName!: string;
  mimeType!: string;
  fileSize!: number;
  uploadedBy!: string | null;
  createdAt!: string;
  downloadUrl!: string;
}

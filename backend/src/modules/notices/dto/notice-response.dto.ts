export class NoticeResponseDto {
  id!: string;
  title!: string;
  content!: string;
  channel!: string;
  publishedAt!: string | null;
  targetScope!: unknown;
  recipientCount!: number;
  readAt!: string | null;
}

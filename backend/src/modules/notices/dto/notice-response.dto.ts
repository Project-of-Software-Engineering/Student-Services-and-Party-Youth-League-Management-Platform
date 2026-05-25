export class NoticeResponseDto {
  id!: string;
  title!: string;
  content!: string;
  channel!: string;
  publishedAt!: string | null;
  targetScope!: unknown;
  recipientCount!: number;
  readCount!: number;
  unreadCount!: number;
  readAt!: string | null;
}

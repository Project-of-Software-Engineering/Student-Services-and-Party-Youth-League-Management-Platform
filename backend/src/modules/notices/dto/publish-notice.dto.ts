import { NoticeChannel } from "@prisma/client";
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

export class PublishNoticeDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsEnum(NoticeChannel)
  channel?: NoticeChannel;

  @IsOptional()
  @IsBoolean()
  allStudents?: boolean;

  @IsOptional()
  @IsArray()
  targetStudentIds?: string[];

  @IsOptional()
  @IsArray()
  targetTags?: string[];
}

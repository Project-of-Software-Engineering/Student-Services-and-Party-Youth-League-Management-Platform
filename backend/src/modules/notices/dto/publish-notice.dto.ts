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

  @IsOptional()
  @IsArray()
  targetGrades?: string[];

  @IsOptional()
  @IsArray()
  targetMajors?: string[];

  @IsOptional()
  @IsArray()
  targetClasses?: string[];

  @IsOptional()
  @IsArray()
  targetPoliticalStates?: string[];
}

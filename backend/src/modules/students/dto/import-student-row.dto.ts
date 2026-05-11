import { StudentStatus } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";

export class ImportStudentRowDto {
  @IsString()
  studentNo!: string;

  @IsString()
  name!: string;

  @IsString()
  grade!: string;

  @IsString()
  major!: string;

  @IsString()
  className!: string;

  @IsOptional()
  @IsString()
  politicalState?: string;

  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsArray()
  honors?: unknown[];

  @IsOptional()
  @IsArray()
  competitions?: unknown[];

  @IsOptional()
  @IsArray()
  practices?: unknown[];
}

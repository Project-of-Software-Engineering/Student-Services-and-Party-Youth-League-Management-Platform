import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength
} from "class-validator";

export class CreateApprovalDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  studentId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  type!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  reason!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  attachmentIds?: string[];
}

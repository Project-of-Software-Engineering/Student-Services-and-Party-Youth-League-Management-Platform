import { ArrayUnique, IsArray, IsOptional, IsString } from "class-validator";

export class CreateApprovalDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsString()
  type!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  attachmentIds?: string[];
}

import { ArrayUnique, IsArray, IsOptional, IsString } from "class-validator";

export class SubmitApprovalDto {
  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  attachmentIds?: string[];
}

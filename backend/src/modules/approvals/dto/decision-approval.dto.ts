import { IsOptional, IsString } from "class-validator";

export class DecisionApprovalDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertLeagueBranchDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(20)
  grade!: string;

  @IsString()
  @MaxLength(100)
  major!: string;

  @IsString()
  @MaxLength(100)
  className!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  secretaryName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  activityPlan?: string;

  @IsOptional()
  @IsObject()
  memberSummary?: Record<string, unknown>;
}

import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdatePolicyDocDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  sourceFileKey?: string;

  @IsOptional()
  @IsString()
  sourceFileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  contentText?: string;
}

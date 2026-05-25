import { IsOptional, IsString } from "class-validator";

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
}

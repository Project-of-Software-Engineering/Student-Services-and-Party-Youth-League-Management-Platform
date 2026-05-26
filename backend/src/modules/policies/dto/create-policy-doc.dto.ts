import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreatePolicyDocDto {
  @IsString()
  title!: string;

  @IsString()
  category!: string;

  @IsString()
  version!: string;

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

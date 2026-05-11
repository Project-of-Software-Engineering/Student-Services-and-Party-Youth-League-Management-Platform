import { IsOptional, IsString } from "class-validator";

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
}

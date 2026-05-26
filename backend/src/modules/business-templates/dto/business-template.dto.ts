import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateBusinessTemplateDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(50)
  category!: string;

  @IsString()
  @MaxLength(50)
  businessType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  fileAttachmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;
}

export class UpdateBusinessTemplateDto extends CreateBusinessTemplateDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

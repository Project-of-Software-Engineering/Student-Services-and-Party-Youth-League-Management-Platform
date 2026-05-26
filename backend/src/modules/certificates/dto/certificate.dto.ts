import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength
} from "class-validator";

export class CreateTemplateDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[A-Z0-9_-]{2,32}$/i, {
    message: "类型编码仅支持 2-32 位字母、数字、下划线或短横线。"
  })
  type!: string;

  @IsString()
  @MinLength(6)
  content!: string;

  @IsArray()
  @IsString({ each: true })
  fields!: string[];
}

export class GenerateCertificateDto {
  @IsString()
  templateId!: string;

  @IsString()
  studentId!: string;

  @IsOptional()
  @IsObject()
  fieldValues?: Record<string, string>;
}

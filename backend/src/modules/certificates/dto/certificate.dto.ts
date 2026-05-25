export class CreateTemplateDto {
  name!: string;
  type!: string;
  content!: string;
  fields!: string[];
}

export class GenerateCertificateDto {
  templateId!: string;
  studentId!: string;
  fieldValues?: Record<string, string>;
}

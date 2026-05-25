export class PolicyDocResponseDto {
  id!: string;
  title!: string;
  category!: string;
  version!: string;
  sourceFileKey!: string;
  sourceFileName!: string;
  status!: string;
  createdById!: string | null;
  createdAt!: string;
  updatedAt!: string;
}

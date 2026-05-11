export class PolicyDocResponseDto {
  id!: string;
  title!: string;
  category!: string;
  version!: string;
  sourceFileKey!: string;
  sourceFileName!: string;
  createdById!: string | null;
  createdAt!: string;
  updatedAt!: string;
}

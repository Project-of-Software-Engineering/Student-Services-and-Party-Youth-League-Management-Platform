export class OperationLogResponseDto {
  id!: string;
  action!: string;
  targetType!: string;
  targetId!: string | null;
  detail!: unknown;
  createdAt!: string;
  operator!: {
    id: string;
    username: string;
    displayName: string;
  } | null;
}

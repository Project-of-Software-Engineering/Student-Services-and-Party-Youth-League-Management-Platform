export class StudentProfileResponseDto {
  id!: string;
  studentId!: string;
  honors!: unknown;
  competitions!: unknown;
  practices!: unknown;
  tags!: string[];
  bio!: string | null;
}

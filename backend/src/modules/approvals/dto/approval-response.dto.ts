import { ApprovalStatus, ApprovalStepDecision } from "@prisma/client";
import { FileResponseDto } from "../../files/dto/file-response.dto";

export class ApprovalStudentResponseDto {
  id!: string;
  studentNo!: string;
  name!: string;
  grade!: string;
  major!: string;
  className!: string;
  politicalState!: string | null;
}

export class ApprovalStepResponseDto {
  id!: string;
  stepNo!: number;
  roleCode!: string;
  decision!: ApprovalStepDecision;
  comment!: string | null;
  decidedAt!: string | null;
  operator!: {
    id: string;
    username: string;
    displayName: string;
  } | null;
}

export class ApprovalResponseDto {
  id!: string;
  type!: string;
  reason!: string;
  status!: ApprovalStatus;
  currentStep!: number;
  submittedAt!: string | null;
  finishedAt!: string | null;
  createdAt!: string;
  updatedAt!: string;
  student!: ApprovalStudentResponseDto;
  steps!: ApprovalStepResponseDto[];
  attachments!: FileResponseDto[];
}

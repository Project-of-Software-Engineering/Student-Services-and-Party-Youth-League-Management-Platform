import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";

type StageStatus = "completed" | "current" | "pending";

const PROCESS_STAGES = [
  {
    code: "application",
    title: "申请提交",
    description: "提交入党入团申请，完成辅导员登记和基础信息确认。"
  },
  {
    code: "league-training",
    title: "团校培养",
    description: "参加培训、完善服务记录，并准备阶段性基础材料。"
  },
  {
    code: "party-applicant",
    title: "积极分子考察",
    description: "提交思想汇报，完成支部推荐与阶段性考察。"
  },
  {
    code: "development-review",
    title: "发展对象审查",
    description: "完成访谈、公示和审查会议材料准备。"
  },
  {
    code: "final-approval",
    title: "最终审批",
    description: "等待上级审批结果，并完成最终材料归档。"
  }
] as const;

@Injectable()
export class ProcessesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMyProcess(currentUser: AuthUser) {
    const student = await this.prisma.student.findUnique({
      where: {
        userId: currentUser.id
      },
      include: {
        profile: true
      }
    });

    const currentStageIndex = this.getCurrentStageIndex(student?.politicalState ?? null);
    const currentStageCode = PROCESS_STAGES[currentStageIndex]?.code ?? null;

    return {
      student: student
        ? {
            id: student.id,
            studentNo: student.studentNo,
            name: student.name,
            politicalState: student.politicalState,
            tags: student.profile?.tags ?? []
          }
        : null,
      currentStageCode,
      stages: PROCESS_STAGES.map((stage, index) => ({
        code: stage.code,
        title: stage.title,
        description: stage.description,
        status: this.getStageStatus(index, currentStageIndex)
      })),
      reminders: this.buildReminders(currentStageCode)
    };
  }

  private getCurrentStageIndex(politicalState: string | null): number {
    switch (politicalState) {
      case "League Member":
        return 1;
      case "Party Applicant":
        return 2;
      case "Development Candidate":
        return 3;
      case "Probationary Party Member":
      case "Party Member":
        return 4;
      default:
        return 0;
    }
  }

  private getStageStatus(index: number, currentStageIndex: number): StageStatus {
    if (index < currentStageIndex) {
      return "completed";
    }

    if (index === currentStageIndex) {
      return "current";
    }

    return "pending";
  }

  private buildReminders(currentStageCode: string | null) {
    switch (currentStageCode) {
      case "league-training":
        return [
          {
            level: "info",
            title: "培训签到提醒",
            description: "请完成本月团校培训签到，并补齐服务时长登记。"
          },
          {
            level: "warning",
            title: "材料核对",
            description: "请在支部审核前准备好个人总结与辅导员核查材料。"
          }
        ];
      case "party-applicant":
        return [
          {
            level: "warning",
            title: "思想汇报待提交",
            description: "请提交本阶段思想汇报，并确认支部推荐时间。"
          },
          {
            level: "info",
            title: "谈话准备",
            description: "请整理政治理论学习笔记和服务实践记录，准备谈话考察。"
          }
        ];
      case "development-review":
        return [
          {
            level: "warning",
            title: "公示期跟进",
            description: "请关注公示时间窗口，并补齐缺失的支撑材料。"
          }
        ];
      case "final-approval":
        return [
          {
            level: "success",
            title: "归档核验",
            description: "请确认全部流程材料已经签字并归档。"
          }
        ];
      default:
        return [
          {
            level: "info",
            title: "初始申请提醒",
            description: "请先完成申请表、辅导员确认和基础身份材料准备。"
          }
        ];
    }
  }
}

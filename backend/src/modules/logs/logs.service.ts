import { Injectable } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { OperationLogResponseDto } from "./dto/operation-log-response.dto";

interface CreateOperationLogInput {
  action: string;
  targetType: string;
  targetId?: string | null;
  operatorId?: string | null;
  detail?: Prisma.InputJsonValue;
}

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findRecent(limit = 20): Promise<OperationLogResponseDto[]> {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const logs = await this.prisma.operationLog.findMany({
      include: {
        operator: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: normalizedLimit
    });

    return logs.map((log) => this.toResponse(log.operator, log));
  }

  createOperationLog(input: CreateOperationLogInput) {
    return this.prisma.operationLog.create({
      data: {
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        operatorId: input.operatorId ?? null,
        detail: input.detail
      }
    });
  }

  private toResponse(
    operator: User | null,
    log: {
      id: string;
      action: string;
      targetType: string;
      targetId: string | null;
      detail: Prisma.JsonValue | null;
      createdAt: Date;
    }
  ): OperationLogResponseDto {
    return {
      id: log.id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      detail: log.detail,
      createdAt: log.createdAt.toISOString(),
      operator: operator
        ? {
            id: operator.id,
            username: operator.username,
            displayName: operator.displayName
          }
        : null
    };
  }
}

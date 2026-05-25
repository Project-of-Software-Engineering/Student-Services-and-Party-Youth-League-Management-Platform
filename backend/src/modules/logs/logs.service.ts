import { Injectable } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import * as ExcelJS from "exceljs";
import { PrismaService } from "../../common/prisma/prisma.service";
import { OperationLogResponseDto } from "./dto/operation-log-response.dto";
import { QueryLogsDto } from "./dto/query-logs.dto";

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

  async findFiltered(query: QueryLogsDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const where = this.buildWhere(query);

    const [logs, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        include: { operator: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.operationLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => this.toResponse(log.operator, log)),
      total,
      page,
      pageSize,
    };
  }

  async findByTarget(targetType: string, targetId: string) {
    const logs = await this.prisma.operationLog.findMany({
      where: { targetType, targetId },
      include: { operator: true },
      orderBy: { createdAt: "desc" },
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

  async exportToExcel(query: QueryLogsDto): Promise<Buffer> {
    const where = this.buildWhere(query);
    const logs = await this.prisma.operationLog.findMany({
      where,
      include: { operator: true },
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("操作日志");
    sheet.columns = [
      { header: "时间", key: "createdAt", width: 22 },
      { header: "操作人", key: "operator", width: 16 },
      { header: "操作", key: "action", width: 20 },
      { header: "对象类型", key: "targetType", width: 16 },
      { header: "对象ID", key: "targetId", width: 24 },
      { header: "详情", key: "detail", width: 40 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF8B0000" },
    };

    for (const log of logs) {
      sheet.addRow({
        createdAt: log.createdAt.toISOString().replace("T", " ").slice(0, 19),
        operator: log.operator?.displayName ?? "-",
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId ?? "-",
        detail: log.detail ? JSON.stringify(log.detail) : "-",
      });
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private buildWhere(query: QueryLogsDto): Prisma.OperationLogWhereInput {
    const where: Prisma.OperationLogWhereInput = {};
    if (query.action) where.action = { contains: query.action };
    if (query.targetType) where.targetType = query.targetType;
    if (query.targetId) where.targetId = query.targetId;
    if (query.operatorId) where.operatorId = query.operatorId;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }
    return where;
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

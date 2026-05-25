import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { LogsService } from "./logs.service";
import { QueryLogsDto } from "./dto/query-logs.dto";

@UseGuards(JwtAuthGuard)
@Controller("logs")
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  findAll(@Query() query: QueryLogsDto) {
    return this.logsService.findFiltered(query);
  }

  @Get("export")
  async exportExcel(@Query() query: QueryLogsDto, @Res() res: Response) {
    const buffer = await this.logsService.exportToExcel(query);
    const fileName = `operation-logs-${Date.now()}.xlsx`;
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("track")
  trackByTarget(
    @Query("targetType") targetType: string,
    @Query("targetId") targetId: string,
  ) {
    return this.logsService.findByTarget(targetType, targetId);
  }
}

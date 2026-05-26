import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { LogsService } from "./logs.service";
import { QueryLogsDto } from "./dto/query-logs.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "teacher")
@Controller("logs")
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  findAll(@Query() query: QueryLogsDto, @CurrentUser() currentUser: AuthUser) {
    return this.logsService.findFiltered(query, currentUser);
  }

  @Get("export")
  async exportExcel(
    @Query() query: QueryLogsDto,
    @CurrentUser() currentUser: AuthUser,
    @Res() res: Response
  ) {
    const buffer = await this.logsService.exportToExcel(query, currentUser);
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
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.logsService.findByTarget(targetType, targetId, currentUser);
  }
}

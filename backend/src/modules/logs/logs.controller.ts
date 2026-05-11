import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { LogsService } from "./logs.service";

@UseGuards(JwtAuthGuard)
@Controller("logs")
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get("recent")
  findRecent(@Query("limit") limit?: string) {
    const parsedLimit = Number(limit);

    return this.logsService.findRecent(Number.isFinite(parsedLimit) ? parsedLimit : undefined);
  }
}

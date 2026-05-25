import { Module } from "@nestjs/common";
import { LogsModule } from "../logs/logs.module";
import { NoticesModule } from "../notices/notices.module";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";

@Module({
  imports: [LogsModule, NoticesModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService]
})
export class ApprovalsModule {}

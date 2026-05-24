import { Module } from "@nestjs/common";
import { LogsModule } from "../logs/logs.module";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";

@Module({
  imports: [LogsModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService]
})
export class ApprovalsModule {}

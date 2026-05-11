import { Module } from "@nestjs/common";
import { LogsModule } from "../logs/logs.module";
import { NoticesController } from "./notices.controller";
import { NoticesService } from "./notices.service";

@Module({
  imports: [LogsModule],
  controllers: [NoticesController],
  providers: [NoticesService]
})
export class NoticesModule {}

import { Module } from "@nestjs/common";
import { LogsModule } from "../logs/logs.module";
import { BusinessTemplatesController } from "./business-templates.controller";
import { BusinessTemplatesService } from "./business-templates.service";

@Module({
  imports: [LogsModule],
  controllers: [BusinessTemplatesController],
  providers: [BusinessTemplatesService]
})
export class BusinessTemplatesModule {}

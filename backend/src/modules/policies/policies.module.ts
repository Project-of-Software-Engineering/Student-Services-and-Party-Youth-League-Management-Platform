import { Module } from "@nestjs/common";
import { LogsModule } from "../logs/logs.module";
import { PoliciesController } from "./policies.controller";
import { PoliciesService } from "./policies.service";

@Module({
  imports: [LogsModule],
  controllers: [PoliciesController],
  providers: [PoliciesService]
})
export class PoliciesModule {}

import { Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module";
import { LogsModule } from "../logs/logs.module";
import { PoliciesController } from "./policies.controller";
import { PoliciesService } from "./policies.service";

@Module({
  imports: [FilesModule, LogsModule],
  controllers: [PoliciesController],
  providers: [PoliciesService]
})
export class PoliciesModule {}

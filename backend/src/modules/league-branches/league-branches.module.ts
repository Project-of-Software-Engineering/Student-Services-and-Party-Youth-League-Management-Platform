import { Module } from "@nestjs/common";
import { LogsModule } from "../logs/logs.module";
import { LeagueBranchesController } from "./league-branches.controller";
import { LeagueBranchesService } from "./league-branches.service";

@Module({
  imports: [LogsModule],
  controllers: [LeagueBranchesController],
  providers: [LeagueBranchesService]
})
export class LeagueBranchesModule {}

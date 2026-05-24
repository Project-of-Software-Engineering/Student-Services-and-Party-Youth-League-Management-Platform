import { Module } from "@nestjs/common";
import { LogsModule } from "../logs/logs.module";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

@Module({
  imports: [LogsModule],
  controllers: [FilesController],
  providers: [FilesService]
})
export class FilesModule {}

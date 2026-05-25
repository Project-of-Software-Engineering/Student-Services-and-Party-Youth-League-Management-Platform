import { Module } from "@nestjs/common";
import { CertificatesController } from "./certificates.controller";
import { CertificatesService } from "./certificates.service";
import { LogsModule } from "../logs/logs.module";

@Module({
  imports: [LogsModule],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ApprovalsModule } from "./modules/approvals/approvals.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BusinessTemplatesModule } from "./modules/business-templates/business-templates.module";
import { CertificatesModule } from "./modules/certificates/certificates.module";
import { FilesModule } from "./modules/files/files.module";
import { LeagueBranchesModule } from "./modules/league-branches/league-branches.module";
import { LogsModule } from "./modules/logs/logs.module";
import { NoticesModule } from "./modules/notices/notices.module";
import { PoliciesModule } from "./modules/policies/policies.module";
import { ProcessesModule } from "./modules/processes/processes.module";
import { StudentsModule } from "./modules/students/students.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    PoliciesModule,
    ProcessesModule,
    ApprovalsModule,
    NoticesModule,
    FilesModule,
    LogsModule,
    CertificatesModule,
    LeagueBranchesModule,
    BusinessTemplatesModule
  ]
})
export class AppModule {}

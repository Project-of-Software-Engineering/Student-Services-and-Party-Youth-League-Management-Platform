import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { ProcessesService } from "./processes.service";

@UseGuards(JwtAuthGuard)
@Controller("processes")
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Get("my")
  findMyProcess(@CurrentUser() currentUser: AuthUser) {
    return this.processesService.findMyProcess(currentUser);
  }
}

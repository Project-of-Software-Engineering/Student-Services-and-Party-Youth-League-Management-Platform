import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { UpsertLeagueBranchDto } from "./dto/league-branch.dto";
import { LeagueBranchesService } from "./league-branches.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("league-branches")
export class LeagueBranchesController {
  constructor(private readonly leagueBranchesService: LeagueBranchesService) {}

  @Get()
  @Roles("admin", "teacher", "leader", "league_secretary", "student")
  findAll(@CurrentUser() currentUser: AuthUser) {
    return this.leagueBranchesService.findAll(currentUser);
  }

  @Post()
  @Roles("admin", "teacher")
  create(@Body() dto: UpsertLeagueBranchDto, @CurrentUser() currentUser: AuthUser) {
    return this.leagueBranchesService.create(dto, currentUser);
  }

  @Patch(":id")
  @Roles("admin", "teacher", "league_secretary")
  update(
    @Param("id") id: string,
    @Body() dto: UpsertLeagueBranchDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.leagueBranchesService.update(id, dto, currentUser);
  }
}

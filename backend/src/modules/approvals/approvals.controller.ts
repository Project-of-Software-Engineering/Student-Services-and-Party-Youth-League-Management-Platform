import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { ApprovalsService } from "./approvals.service";
import { CreateApprovalDto } from "./dto/create-approval.dto";
import { DecisionApprovalDto } from "./dto/decision-approval.dto";
import { SubmitApprovalDto } from "./dto/submit-approval.dto";

@UseGuards(JwtAuthGuard)
@Controller("approvals")
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get("summary")
  getSummary(@CurrentUser() currentUser: AuthUser) {
    return this.approvalsService.getSummary(currentUser);
  }

  @Get("export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="approvals.csv"')
  exportCsv(@CurrentUser() currentUser: AuthUser) {
    return this.approvalsService.exportCsv(currentUser);
  }

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthUser,
    @Query("status") status?: string,
    @Query("mine") mine?: string,
    @Query("limit") limit?: string
  ) {
    const parsedLimit = Number(limit);
    return this.approvalsService.findAll(currentUser, {
      status,
      mine: mine === "true",
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined
    });
  }

  @Post()
  create(@Body() dto: CreateApprovalDto, @CurrentUser() currentUser: AuthUser) {
    return this.approvalsService.create(dto, currentUser);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() currentUser: AuthUser) {
    return this.approvalsService.findOne(id, currentUser);
  }

  @Post(":id/submit")
  submit(
    @Param("id") id: string,
    @Body() dto: SubmitApprovalDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.approvalsService.submit(id, dto, currentUser);
  }

  @Post(":id/approve")
  approve(
    @Param("id") id: string,
    @Body() dto: DecisionApprovalDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.approvalsService.approve(id, dto, currentUser);
  }

  @Post(":id/reject")
  reject(
    @Param("id") id: string,
    @Body() dto: DecisionApprovalDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.approvalsService.reject(id, dto, currentUser);
  }

  @Post(":id/return")
  returnForSupplement(
    @Param("id") id: string,
    @Body() dto: DecisionApprovalDto,
    @CurrentUser() currentUser: AuthUser
  ) {
    return this.approvalsService.returnForSupplement(id, dto, currentUser);
  }
}

import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { CreatePolicyDocDto } from "./dto/create-policy-doc.dto";
import { PoliciesService } from "./policies.service";

@UseGuards(JwtAuthGuard)
@Controller("policies")
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  findAll(@Query("category") category?: string, @Query("keyword") keyword?: string) {
    return this.policiesService.findAll({ category, keyword });
  }

  @Get("ask")
  ask(@Query("q") question?: string) {
    return this.policiesService.answerQuestion(question ?? "");
  }

  @Post()
  create(@Body() dto: CreatePolicyDocDto, @CurrentUser() currentUser: AuthUser) {
    return this.policiesService.create(dto, currentUser);
  }
}

import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { NoticesService } from "./notices.service";
import { PublishNoticeDto } from "./dto/publish-notice.dto";

@UseGuards(JwtAuthGuard)
@Controller("notices")
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Get("my")
  findMyNotices(@CurrentUser() currentUser: AuthUser) {
    return this.noticesService.findMyNotices(currentUser);
  }

  @Get("published")
  findPublished(@Query("limit") limit?: string) {
    const parsedLimit = Number(limit);
    return this.noticesService.findPublished(Number.isFinite(parsedLimit) ? parsedLimit : undefined);
  }

  @Post("publish")
  publish(@Body() dto: PublishNoticeDto, @CurrentUser() currentUser: AuthUser) {
    return this.noticesService.publish(dto, currentUser);
  }
}

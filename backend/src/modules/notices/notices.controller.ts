import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { NoticesService } from "./notices.service";
import { PublishNoticeDto } from "./dto/publish-notice.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("notices")
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Get("my")
  findMyNotices(@CurrentUser() currentUser: AuthUser) {
    return this.noticesService.findMyNotices(currentUser);
  }

  @Get("published")
  @Roles("admin", "teacher", "leader")
  findPublished(@Query("limit") limit: string | undefined, @CurrentUser() currentUser: AuthUser) {
    const parsedLimit = Number(limit);
    return this.noticesService.findPublished(
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      currentUser
    );
  }

  @Post("publish")
  @Roles("admin", "teacher", "leader")
  publish(@Body() dto: PublishNoticeDto, @CurrentUser() currentUser: AuthUser) {
    return this.noticesService.publish(dto, currentUser);
  }

  @Post(":id/read")
  markAsRead(@Param("id") id: string, @CurrentUser() currentUser: AuthUser) {
    return this.noticesService.markAsRead(id, currentUser);
  }
}

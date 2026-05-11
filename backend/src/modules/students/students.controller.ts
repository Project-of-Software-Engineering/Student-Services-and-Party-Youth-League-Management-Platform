import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { ImportStudentsDto } from "./dto/import-students.dto";
import { StudentsService } from "./students.service";

@UseGuards(JwtAuthGuard)
@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get("me")
  findMine(@CurrentUser() currentUser: AuthUser) {
    return this.studentsService.findByUserId(currentUser.id);
  }

  @Get("me/profile")
  findMyProfile(@CurrentUser() currentUser: AuthUser) {
    return this.studentsService.findProfileByUserId(currentUser.id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.studentsService.findOne(id);
  }

  @Get(":id/profile")
  findProfile(@Param("id") id: string) {
    return this.studentsService.findProfile(id);
  }

  @Post("import")
  importStudents(@Body() dto: ImportStudentsDto, @CurrentUser() operator: AuthUser) {
    return this.studentsService.importStudents(dto, operator);
  }
}

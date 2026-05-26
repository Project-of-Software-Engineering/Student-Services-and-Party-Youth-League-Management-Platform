import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { UserResponseDto } from "./dto/user-response.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(currentUser: AuthUser): Promise<UserResponseDto[]> {
    this.assertCanViewUsers(currentUser);

    const users = await this.prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      status: user.status,
      roles: user.roles.map((item) => item.role.code)
    }));
  }

  findForAuth(username: string) {
    return this.prisma.user.findUnique({
      where: {
        username
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });
  }

  async findAuthUserById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles.map((item) => item.role.code)
    };
  }

  private assertCanViewUsers(currentUser: AuthUser) {
    const allowedRoles = new Set(["admin", "teacher"]);
    if (!currentUser.roles.some((role) => allowedRoles.has(role))) {
      throw new ForbiddenException("仅管理员或教师可以查看用户列表。");
    }
  }
}

import { Injectable } from "@nestjs/common";
import { Prisma, StudentStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LogsService } from "../logs/logs.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { ImportStudentsDto } from "./dto/import-students.dto";
import { ImportStudentRowDto } from "./dto/import-student-row.dto";
import { StudentProfileResponseDto } from "./dto/student-profile-response.dto";
import { StudentResponseDto } from "./dto/student-response.dto";

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService
  ) {}

  async findAll(): Promise<StudentResponseDto[]> {
    const students = await this.prisma.student.findMany({
      include: {
        profile: true
      },
      orderBy: [
        {
          grade: "asc"
        },
        {
          studentNo: "asc"
        }
      ]
    });

    return students.map((student) => ({
      id: student.id,
      studentNo: student.studentNo,
      name: student.name,
      grade: student.grade,
      major: student.major,
      className: student.className,
      politicalState: student.politicalState,
      status: student.status
    }));
  }

  async findOne(id: string): Promise<StudentResponseDto | null> {
    const student = await this.prisma.student.findUnique({
      where: {
        id
      }
    });

    if (!student) {
      return null;
    }

    return {
      id: student.id,
      studentNo: student.studentNo,
      name: student.name,
      grade: student.grade,
      major: student.major,
      className: student.className,
      politicalState: student.politicalState,
      status: student.status
    };
  }

  async findByUserId(userId: string): Promise<StudentResponseDto | null> {
    const student = await this.prisma.student.findUnique({
      where: {
        userId
      }
    });

    if (!student) {
      return null;
    }

    return {
      id: student.id,
      studentNo: student.studentNo,
      name: student.name,
      grade: student.grade,
      major: student.major,
      className: student.className,
      politicalState: student.politicalState,
      status: student.status
    };
  }

  async findProfile(id: string): Promise<StudentProfileResponseDto | null> {
    const profile = await this.prisma.studentProfile.findUnique({
      where: {
        studentId: id
      }
    });

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      studentId: profile.studentId,
      honors: profile.honors,
      competitions: profile.competitions,
      practices: profile.practices,
      tags: profile.tags,
      bio: profile.bio
    };
  }

  async findProfileByUserId(userId: string): Promise<StudentProfileResponseDto | null> {
    const student = await this.prisma.student.findUnique({
      where: {
        userId
      },
      select: {
        id: true
      }
    });

    if (!student) {
      return null;
    }

    return this.findProfile(student.id);
  }

  async importStudents(dto: ImportStudentsDto, operator: AuthUser) {
    const summary = await this.prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      let profilesCreated = 0;
      let profilesUpdated = 0;

      for (const row of dto.rows) {
        const existingStudent = await tx.student.findUnique({
          where: {
            studentNo: row.studentNo
          },
          select: {
            id: true
          }
        });

        const student = existingStudent
          ? await tx.student.update({
              where: {
                id: existingStudent.id
              },
              data: this.buildStudentUpsertData(row)
            })
          : await tx.student.create({
              data: this.buildStudentUpsertData(row)
            });

        if (existingStudent) {
          updated += 1;
        } else {
          created += 1;
        }

        if (!this.hasProfilePayload(row)) {
          continue;
        }

        const existingProfile = await tx.studentProfile.findUnique({
          where: {
            studentId: student.id
          },
          select: {
            id: true
          }
        });

        if (existingProfile) {
          await tx.studentProfile.update({
            where: {
              studentId: student.id
            },
            data: this.buildProfileUpdateData(row)
          });
          profilesUpdated += 1;
          continue;
        }

        await tx.studentProfile.create({
          data: {
            studentId: student.id,
            ...this.buildProfileCreateData(row)
          }
        });
        profilesCreated += 1;
      }

      return {
        created,
        updated,
        profilesCreated,
        profilesUpdated
      };
    });

    await this.logsService.createOperationLog({
      action: "students.import",
      targetType: "Student",
      operatorId: operator.id,
      detail: {
        sourceFileName: dto.sourceFileName ?? "manual-import.json",
        rows: dto.rows.length,
        created: summary.created,
        updated: summary.updated,
        profilesCreated: summary.profilesCreated,
        profilesUpdated: summary.profilesUpdated
      }
    });

    return {
      imported: dto.rows.length,
      sourceFileName: dto.sourceFileName ?? "manual-import.json",
      status: "completed",
      ...summary
    };
  }

  private buildStudentUpsertData(row: ImportStudentRowDto) {
    return {
      studentNo: row.studentNo,
      name: row.name,
      grade: row.grade,
      major: row.major,
      className: row.className,
      politicalState: row.politicalState ?? null,
      status: row.status ?? StudentStatus.ACTIVE
    };
  }

  private hasProfilePayload(row: ImportStudentRowDto): boolean {
    return Boolean(
      row.bio ||
        row.tags?.length ||
        row.honors?.length ||
        row.competitions?.length ||
        row.practices?.length
    );
  }

  private buildProfileCreateData(row: ImportStudentRowDto) {
    return {
      ...(row.honors ? { honors: row.honors as Prisma.InputJsonValue } : {}),
      ...(row.competitions ? { competitions: row.competitions as Prisma.InputJsonValue } : {}),
      ...(row.practices ? { practices: row.practices as Prisma.InputJsonValue } : {}),
      tags: row.tags ?? [],
      bio: row.bio ?? null
    };
  }

  private buildProfileUpdateData(row: ImportStudentRowDto) {
    return {
      ...(row.honors ? { honors: row.honors as Prisma.InputJsonValue } : {}),
      ...(row.competitions ? { competitions: row.competitions as Prisma.InputJsonValue } : {}),
      ...(row.practices ? { practices: row.practices as Prisma.InputJsonValue } : {}),
      ...(row.tags ? { tags: row.tags } : {}),
      ...(row.bio !== undefined ? { bio: row.bio } : {})
    };
  }
}

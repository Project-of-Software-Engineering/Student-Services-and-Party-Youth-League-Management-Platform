import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma, StudentStatus } from "@prisma/client";
import * as ExcelJS from "exceljs";
import readXlsxFile from "read-excel-file/node";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LogsService } from "../logs/logs.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { UploadedFilePayload } from "../files/files.service";
import { ImportStudentsDto } from "./dto/import-students.dto";
import { ImportStudentRowDto } from "./dto/import-student-row.dto";
import { StudentProfileResponseDto } from "./dto/student-profile-response.dto";
import { StudentResponseDto } from "./dto/student-response.dto";

const STUDENT_EXCEL_HEADERS: Record<string, keyof ImportStudentRowDto> = {
  studentNo: "studentNo",
  "学号": "studentNo",
  name: "name",
  "姓名": "name",
  grade: "grade",
  "年级": "grade",
  major: "major",
  "专业": "major",
  className: "className",
  "班级": "className",
  politicalState: "politicalState",
  "政治面貌": "politicalState",
  status: "status",
  "状态": "status",
  bio: "bio",
  "简介": "bio",
  tags: "tags",
  "标签": "tags",
  honors: "honors",
  "荣誉": "honors",
  competitions: "competitions",
  "竞赛": "competitions",
  practices: "practices",
  "实践": "practices"
};

const REQUIRED_IMPORT_FIELDS: Array<keyof ImportStudentRowDto> = [
  "studentNo",
  "name",
  "grade",
  "major",
  "className"
];

const STUDENT_EXPORT_HEADERS = [
  "学号",
  "姓名",
  "年级",
  "专业",
  "班级",
  "政治面貌",
  "状态",
  "简介",
  "标签",
  "荣誉",
  "竞赛",
  "实践"
] as const;

const STUDENT_TEMPLATE_SAMPLE = [
  "20230001",
  "李明",
  "2023",
  "软件工程",
  "SE-1",
  "共青团员",
  "ACTIVE",
  "学生简介示例",
  "团员、科研",
  "校级优秀学生",
  "程序设计竞赛二等奖",
  "志愿服务周"
] as const;

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService
  ) {}

  async findAll(currentUser: AuthUser): Promise<StudentResponseDto[]> {
    this.assertCanManageStudents(currentUser);

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
    this.assertCanManageStudents(operator);

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

  async importStudentsFromExcel(file: UploadedFilePayload | undefined, operator: AuthUser) {
    this.assertCanManageStudents(operator);

    if (!file?.buffer?.length) {
      throw new BadRequestException("请上传有效的 Excel 文件。");
    }

    const rows = await this.parseExcelRows(file.buffer);
    return this.importStudents(
      {
        sourceFileName: file.originalname || "students.xlsx",
        rows
      },
      operator
    );
  }

  async buildImportTemplate(currentUser: AuthUser): Promise<Buffer> {
    this.assertCanManageStudents(currentUser);

    const workbook = this.createStudentWorkbook("学生导入模板");
    const tipsWorksheet = workbook.addWorksheet("填写说明");
    tipsWorksheet.addRow(STUDENT_EXPORT_HEADERS);
    tipsWorksheet.addRow(STUDENT_TEMPLATE_SAMPLE);
    tipsWorksheet.addRow([
      "说明",
      "必填",
      "必填",
      "必填",
      "必填",
      "可选",
      "可选：ACTIVE、LEAVE、GRADUATED、DROPPED_OUT",
      "可选",
      "可选：用逗号、顿号或分号分隔",
      "可选",
      "可选",
      "可选"
    ]);
    tipsWorksheet.columns.forEach((column) => {
      column.width = 22;
    });

    await this.logsService.createOperationLog({
      action: "students.template.download",
      targetType: "Student",
      operatorId: currentUser.id,
      detail: {
        fileName: "students-import-template.xlsx"
      }
    });

    return this.writeWorkbook(workbook);
  }

  async exportStudents(currentUser: AuthUser): Promise<Buffer> {
    this.assertCanManageStudents(currentUser);

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

    const workbook = this.createStudentWorkbook("学生数据导出");
    const worksheet = workbook.getWorksheet("学生数据");
    if (!worksheet) {
      throw new Error("学生数据工作表创建失败。");
    }

    for (const student of students) {
      worksheet.addRow([
        student.studentNo,
        student.name,
        student.grade,
        student.major,
        student.className,
        student.politicalState ?? "",
        student.status,
        student.profile?.bio ?? "",
        student.profile?.tags.join("、") ?? "",
        this.stringifyProfileField(student.profile?.honors),
        this.stringifyProfileField(student.profile?.competitions),
        this.stringifyProfileField(student.profile?.practices)
      ]);
    }

    await this.logsService.createOperationLog({
      action: "students.export",
      targetType: "Student",
      operatorId: currentUser.id,
      detail: {
        fileName: "students-export.xlsx",
        rows: students.length
      }
    });

    return this.writeWorkbook(workbook);
  }

  private async parseExcelRows(buffer: Buffer): Promise<ImportStudentRowDto[]> {
    let sheetRows: unknown[][];
    try {
      sheetRows = (await readXlsxFile(buffer)) as unknown as unknown[][];
    } catch {
      throw new BadRequestException("Excel 文件解析失败，请确认文件格式为 .xlsx。");
    }

    if (sheetRows.length < 2) {
      throw new BadRequestException("Excel 文件中没有可导入的数据行。");
    }

    const headers = sheetRows[0].map((item) => this.normalizeCellText(item));
    const rawRows = sheetRows
      .slice(1)
      .filter((items) => items.some((item) => this.normalizeCellText(item)))
      .map((items) => this.buildRawExcelRow(headers, items));

    if (rawRows.length === 0) {
      throw new BadRequestException("Excel 文件中没有可导入的数据行。");
    }

    const errors: string[] = [];
    const rows = rawRows.map((rawRow, index) => {
      const rowNumber = index + 2;
      const mappedRow = this.mapExcelRow(rawRow);

      for (const field of REQUIRED_IMPORT_FIELDS) {
        if (!String(mappedRow[field] ?? "").trim()) {
          errors.push(`第 ${rowNumber} 行缺少 ${this.getFieldLabel(field)}`);
        }
      }

      if (mappedRow.status && !Object.values(StudentStatus).includes(mappedRow.status)) {
        errors.push(`第 ${rowNumber} 行状态值无效，应为 ACTIVE、LEAVE、GRADUATED 或 DROPPED_OUT`);
      }

      return mappedRow;
    });

    if (errors.length > 0) {
      throw new BadRequestException(errors.slice(0, 20));
    }

    return rows;
  }

  private buildRawExcelRow(headers: string[], values: unknown[]): Record<string, unknown> {
    return headers.reduce<Record<string, unknown>>((row, header, index) => {
      if (header) {
        row[header] = values[index] ?? "";
      }
      return row;
    }, {});
  }

  private mapExcelRow(rawRow: Record<string, unknown>): ImportStudentRowDto {
    const row: ImportStudentRowDto = {
      studentNo: "",
      name: "",
      grade: "",
      major: "",
      className: ""
    };

    for (const [header, value] of Object.entries(rawRow)) {
      const field = STUDENT_EXCEL_HEADERS[header.trim()];
      if (!field) {
        continue;
      }

      if (field === "tags") {
        row.tags = this.parseStringList(value);
        continue;
      }

      if (field === "honors" || field === "competitions" || field === "practices") {
        row[field] = this.parseJsonArray(value, field);
        continue;
      }

      const text = this.normalizeCellText(value);
      if (field === "status" && text) {
        row.status = text as StudentStatus;
        continue;
      }

      row[field] = text as never;
    }

    return row;
  }

  private parseStringList(value: unknown): string[] {
    return this.normalizeCellText(value)
      .split(/[,\uFF0C;\uFF1B\u3001]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private parseJsonArray(value: unknown, field: "honors" | "competitions" | "practices"): unknown[] {
    const text = this.normalizeCellText(value);
    if (!text) {
      return [];
    }

    if (text.startsWith("[")) {
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [{ value: text }];
      } catch {
        return [{ value: text }];
      }
    }

    const fieldLabels = {
      honors: "荣誉",
      competitions: "竞赛",
      practices: "实践"
    };
    return this.parseStringList(text).map((item) => ({
      title: item,
      type: fieldLabels[field]
    }));
  }

  private normalizeCellText(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value).trim();
  }

  private getFieldLabel(field: keyof ImportStudentRowDto): string {
    const labels: Record<string, string> = {
      studentNo: "学号",
      name: "姓名",
      grade: "年级",
      major: "专业",
      className: "班级"
    };
    return labels[field] ?? field;
  }

  private assertCanManageStudents(currentUser: AuthUser) {
    const allowedRoles = new Set(["admin", "teacher"]);
    if (!currentUser.roles.some((role) => allowedRoles.has(role))) {
      throw new ForbiddenException("仅管理员或教师可以维护学生数据。");
    }
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

  private createStudentWorkbook(title: string) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Student Services Platform";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet("学生数据");
    worksheet.columns = STUDENT_EXPORT_HEADERS.map((header) => ({
      header,
      key: header,
      width: Math.max(String(header).length + 8, 16)
    }));

    worksheet.getRow(1).font = {
      bold: true,
      color: {
        argb: "FFFFFFFF"
      }
    };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF9D0000"
      }
    };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.properties.defaultRowHeight = 22;
    worksheet.headerFooter.oddHeader = title;

    return workbook;
  }

  private stringifyProfileField(value: Prisma.JsonValue | null | undefined): string {
    if (!value) {
      return "";
    }

    if (!Array.isArray(value)) {
      return String(value);
    }

    return value
      .map((item) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const record = item as Record<string, unknown>;
          return String(record.title ?? record.name ?? record.value ?? JSON.stringify(record));
        }
        return String(item);
      })
      .filter(Boolean)
      .join("、");
  }

  private async writeWorkbook(workbook: ExcelJS.Workbook): Promise<Buffer> {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  }
}

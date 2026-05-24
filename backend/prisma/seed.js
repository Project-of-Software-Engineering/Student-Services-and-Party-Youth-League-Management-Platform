const path = require("path");
const fs = require("fs/promises");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  await prisma.noticeTarget.deleteMany({
    where: {
      notice: {
        title: {
          in: ["May Process Reminder", "Service Team Check-In"]
        }
      }
    }
  });

  await prisma.notice.deleteMany({
    where: {
      title: {
        in: ["May Process Reminder", "Service Team Check-In"]
      }
    }
  });

  await prisma.policyDoc.deleteMany({
    where: {
      title: {
        in: [
          "Scholarship Review Guidelines",
          "Party Development Process Handbook",
          "League Activity Attendance Rules",
          "Volunteer Service Credit Rules"
        ]
      }
    }
  });

  await prisma.attachment.deleteMany({
    where: {
      fileKey: {
        startsWith: "seed/approvals/"
      }
    }
  });

  await prisma.approval.deleteMany({
    where: {
      type: {
        in: ["党团发展材料终审", "志愿服务时长认定", "奖助学金材料补充"]
      }
    }
  });

  const roleCodes = [
    ["admin", "系统管理员"],
    ["teacher", "教师"],
    ["leader", "领导"],
    ["student", "学生"]
  ];

  for (const [code, name] of roleCodes) {
    await prisma.role.upsert({
      where: { code },
      update: { name },
      create: { code, name }
    });
  }

  const adminPasswordHash = await bcrypt.hash("demo1234", 10);
  const studentPasswordHash = await bcrypt.hash("demo1234", 10);

  const admin = await prisma.user.upsert({
    where: { username: "demo.admin" },
    update: {
      displayName: "演示管理员",
      passwordHash: adminPasswordHash,
      status: "ACTIVE"
    },
    create: {
      username: "demo.admin",
      displayName: "演示管理员",
      passwordHash: adminPasswordHash,
      status: "ACTIVE"
    }
  });

  const teacher = await prisma.user.upsert({
    where: { username: "demo.teacher" },
    update: {
      displayName: "演示教师",
      passwordHash: adminPasswordHash,
      status: "ACTIVE"
    },
    create: {
      username: "demo.teacher",
      displayName: "演示教师",
      passwordHash: adminPasswordHash,
      status: "ACTIVE"
    }
  });

  const leader = await prisma.user.upsert({
    where: { username: "demo.leader" },
    update: {
      displayName: "演示领导",
      passwordHash: adminPasswordHash,
      status: "ACTIVE"
    },
    create: {
      username: "demo.leader",
      displayName: "演示领导",
      passwordHash: adminPasswordHash,
      status: "ACTIVE"
    }
  });

  const studentUser = await prisma.user.upsert({
    where: { username: "demo.student" },
    update: {
      displayName: "李明",
      passwordHash: studentPasswordHash,
      status: "ACTIVE"
    },
    create: {
      username: "demo.student",
      displayName: "李明",
      passwordHash: studentPasswordHash,
      status: "ACTIVE"
    }
  });

  const roles = await prisma.role.findMany();
  const roleMap = new Map(roles.map((role) => [role.code, role.id]));

  const userRolePairs = [
    [admin.id, roleMap.get("admin")],
    [teacher.id, roleMap.get("teacher")],
    [leader.id, roleMap.get("leader")],
    [studentUser.id, roleMap.get("student")]
  ];

  for (const [userId, roleId] of userRolePairs) {
    if (!roleId) continue;
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      },
      update: {},
      create: {
        userId,
        roleId
      }
    });
  }

  const firstStudent = await prisma.student.upsert({
    where: { studentNo: "20230001" },
    update: {
      name: "李明",
      grade: "2023",
      major: "软件工程",
      className: "SE-1",
      politicalState: "League Member",
      status: "ACTIVE",
      userId: studentUser.id
    },
    create: {
      studentNo: "20230001",
      name: "李明",
      grade: "2023",
      major: "软件工程",
      className: "SE-1",
      politicalState: "League Member",
      status: "ACTIVE",
      userId: studentUser.id
    }
  });

  const secondStudent = await prisma.student.upsert({
    where: { studentNo: "20230002" },
    update: {
      name: "周晴",
      grade: "2023",
      major: "软件工程",
      className: "SE-1",
      politicalState: "Party Applicant",
      status: "ACTIVE"
    },
    create: {
      studentNo: "20230002",
      name: "周晴",
      grade: "2023",
      major: "软件工程",
      className: "SE-1",
      politicalState: "Party Applicant",
      status: "ACTIVE"
    }
  });

  await prisma.studentProfile.upsert({
    where: { studentId: firstStudent.id },
    update: {
      honors: [
        { title: "国家奖学金提名", year: 2024 },
        { title: "优秀共青团员", year: 2025 }
      ],
      competitions: [
        { name: "服务创新挑战赛", award: "一等奖" }
      ],
      practices: [
        { name: "社区志愿服务", hours: 48 }
      ],
      tags: ["团员", "服务", "软件工程"],
      bio: "长期参与工程实践、学生服务与党团工作，注重综合能力提升。"
    },
    create: {
      studentId: firstStudent.id,
      honors: [
        { title: "国家奖学金提名", year: 2024 },
        { title: "优秀共青团员", year: 2025 }
      ],
      competitions: [
        { name: "服务创新挑战赛", award: "一等奖" }
      ],
      practices: [
        { name: "社区志愿服务", hours: 48 }
      ],
      tags: ["团员", "服务", "软件工程"],
      bio: "长期参与工程实践、学生服务与党团工作，注重综合能力提升。"
    }
  });

  await prisma.studentProfile.upsert({
    where: { studentId: secondStudent.id },
    update: {
      honors: [{ title: "志愿先锋", year: 2024 }],
      competitions: [{ name: "校园科研海报赛", award: "优秀奖" }],
      practices: [{ name: "宿舍朋辈导师", hours: 24 }],
      tags: ["入党积极分子", "科研"],
      bio: "关注科研训练、志愿服务和党员发展活动，积极参与集体事务。"
    },
    create: {
      studentId: secondStudent.id,
      honors: [{ title: "志愿先锋", year: 2024 }],
      competitions: [{ name: "校园科研海报赛", award: "优秀奖" }],
      practices: [{ name: "宿舍朋辈导师", hours: 24 }],
      tags: ["入党积极分子", "科研"],
      bio: "关注科研训练、志愿服务和党员发展活动，积极参与集体事务。"
    }
  });

  const policySeeds = [
    {
      title: "奖助学金评审办法",
      category: "奖助管理",
      version: "2026.1",
      sourceFileKey: "seed/policies/scholarship-review-guidelines.md",
      sourceFileName: "奖助学金评审办法.md"
    },
    {
      title: "党员发展流程手册",
      category: "党团工作",
      version: "2026.1",
      sourceFileKey: "seed/policies/party-development-process-handbook.md",
      sourceFileName: "党员发展流程手册.md"
    },
    {
      title: "团学活动考勤规定",
      category: "党团工作",
      version: "2026.1",
      sourceFileKey: "seed/policies/league-activity-attendance-rules.md",
      sourceFileName: "团学活动考勤规定.md"
    }
  ];

  for (const item of policySeeds) {
    const existing = await prisma.policyDoc.findFirst({
      where: {
        title: item.title,
        version: item.version
      }
    });

    if (existing) {
      await prisma.policyDoc.update({
        where: {
          id: existing.id
        },
        data: {
          category: item.category,
          sourceFileKey: item.sourceFileKey,
          sourceFileName: item.sourceFileName,
          createdById: admin.id
        }
      });
      continue;
    }

    await prisma.policyDoc.create({
      data: {
        ...item,
        createdById: admin.id
      }
    });
  }

  const seededNotice = await prisma.notice.findFirst({
    where: {
      title: "五月流程办理提醒"
    }
  });

  const notice =
    seededNotice
      ? await prisma.notice.update({
          where: { id: seededNotice.id },
          data: {
            title: "五月流程办理提醒",
            content: "请在本周五前完成本月流程材料提交、培训签到和个人总结填报。",
            channel: "IN_APP",
            publishedById: admin.id,
            publishedAt: new Date("2026-05-11T08:00:00.000Z"),
            targetScope: {
              allStudents: false,
              targetTags: ["团员", "入党积极分子"],
              targetStudentIds: []
            }
          }
        })
      : await prisma.notice.create({
          data: {
            title: "五月流程办理提醒",
            content: "请在本周五前完成本月流程材料提交、培训签到和个人总结填报。",
            channel: "IN_APP",
            publishedById: admin.id,
            publishedAt: new Date("2026-05-11T08:00:00.000Z"),
            targetScope: {
              allStudents: false,
              targetTags: ["团员", "入党积极分子"],
              targetStudentIds: []
            }
          }
        });

  await prisma.noticeTarget.deleteMany({
    where: {
      noticeId: notice.id
    }
  });

  await prisma.noticeTarget.createMany({
    data: [
      {
        noticeId: notice.id,
        studentId: firstStudent.id
      },
      {
        noticeId: notice.id,
        studentId: secondStudent.id
      }
    ]
  });

  const approvalSeedDir = path.join(__dirname, "..", "storage", "uploads", "seed", "approvals");
  await fs.mkdir(approvalSeedDir, { recursive: true });

  const finalReviewFileName = "final-review-material.txt";
  const finalReviewContent = "党团发展材料终审演示附件：含思想汇报、培训签到、支部意见摘要。";
  await fs.writeFile(path.join(approvalSeedDir, finalReviewFileName), finalReviewContent);

  const finalApproval = await prisma.approval.create({
    data: {
      studentId: firstStudent.id,
      type: "党团发展材料终审",
      reason: "演示审批：学生已完成团校培养和积极分子考察，申请进入最终审批。",
      status: "IN_REVIEW",
      currentStep: 2,
      submittedAt: new Date("2026-05-12T02:00:00.000Z"),
      steps: {
        create: [
          {
            stepNo: 1,
            roleCode: "teacher",
            decision: "APPROVED",
            operatorId: teacher.id,
            comment: "材料齐全，建议进入复核。",
            decidedAt: new Date("2026-05-12T08:00:00.000Z")
          },
          {
            stepNo: 2,
            roleCode: "admin",
            decision: "APPROVED",
            operatorId: admin.id,
            comment: "画像、服务时长与流程节点一致。",
            decidedAt: new Date("2026-05-13T06:20:00.000Z")
          },
          {
            stepNo: 3,
            roleCode: "leader",
            decision: "PENDING"
          }
        ]
      }
    }
  });

  await prisma.attachment.create({
    data: {
      ownerType: "approval",
      ownerId: finalApproval.id,
      fileKey: `seed/approvals/${finalReviewFileName}`,
      fileName: "党团发展材料终审摘要.txt",
      mimeType: "text/plain",
      fileSize: Buffer.byteLength(finalReviewContent),
      uploadedBy: studentUser.id
    }
  });

  await prisma.approval.create({
    data: {
      studentId: secondStudent.id,
      type: "志愿服务时长认定",
      reason: "演示审批：申请认定本学期社区服务与朋辈导师服务时长。",
      status: "RETURNED",
      currentStep: 0,
      submittedAt: new Date("2026-05-10T03:00:00.000Z"),
      steps: {
        create: [
          {
            stepNo: 1,
            roleCode: "teacher",
            decision: "RETURNED",
            operatorId: teacher.id,
            comment: "请补充服务单位证明和签到记录。",
            decidedAt: new Date("2026-05-10T09:00:00.000Z")
          },
          {
            stepNo: 2,
            roleCode: "admin",
            decision: "PENDING"
          },
          {
            stepNo: 3,
            roleCode: "leader",
            decision: "PENDING"
          }
        ]
      }
    }
  });

  await prisma.approval.create({
    data: {
      studentId: firstStudent.id,
      type: "奖助学金材料补充",
      reason: "演示审批：补充竞赛获奖证明，用于奖助学金材料归档。",
      status: "APPROVED",
      currentStep: 2,
      submittedAt: new Date("2026-05-02T03:00:00.000Z"),
      finishedAt: new Date("2026-05-05T09:30:00.000Z"),
      steps: {
        create: [
          {
            stepNo: 1,
            roleCode: "teacher",
            decision: "APPROVED",
            operatorId: teacher.id,
            comment: "证明材料清晰。",
            decidedAt: new Date("2026-05-02T10:00:00.000Z")
          },
          {
            stepNo: 2,
            roleCode: "admin",
            decision: "APPROVED",
            operatorId: admin.id,
            comment: "已完成复核。",
            decidedAt: new Date("2026-05-04T08:00:00.000Z")
          },
          {
            stepNo: 3,
            roleCode: "leader",
            decision: "APPROVED",
            operatorId: leader.id,
            comment: "同意归档。",
            decidedAt: new Date("2026-05-05T09:30:00.000Z")
          }
        ]
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

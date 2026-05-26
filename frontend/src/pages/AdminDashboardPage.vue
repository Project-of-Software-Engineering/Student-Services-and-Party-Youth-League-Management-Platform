<script setup lang="ts">
import { computed, ref } from "vue";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { useRoute } from "vue-router";
import AppShell from "@/components/AppShell.vue";
import { http } from "@/services/http";
import { useSessionStore } from "@/stores/session";

const links = [
  { to: "/", label: "首页" },
  { to: "/student", label: "学生端" },
  { to: "/admin", label: "管理端" },
  { to: "/leader", label: "领导端" }
];

interface PolicyDoc {
  id: string;
  title: string;
  category: string;
  version: string;
  sourceFileKey: string;
  sourceFileName: string;
  contentText: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

const session = useSessionStore();
session.hydrate();
const queryClient = useQueryClient();
const route = useRoute();
const canUseCoreAdmin = computed(() =>
  Boolean(session.user?.roles.some((role) => role === "admin" || role === "teacher"))
);
const canViewAdminAudit = computed(() =>
  Boolean(session.user?.roles.some((role) => role === "admin" || role === "teacher" || role === "leader"))
);

const adminSections = [
  { key: "overview", to: "/admin", label: "总览" },
  { key: "students", to: "/admin/students", label: "学生导入" },
  { key: "organizations", to: "/admin/organizations", label: "组织维护" },
  { key: "policies", to: "/admin/policies", label: "政策维护" },
  { key: "notices", to: "/admin/notices", label: "通知发布" },
  { key: "templates", to: "/admin/templates", label: "模板配置" },
  { key: "certificates", to: "/admin/certificates", label: "电子证明" },
  { key: "logs", to: "/admin/logs", label: "操作日志" }
] as const;

type AdminSectionKey = (typeof adminSections)[number]["key"];

const activeAdminSection = computed<AdminSectionKey>(() => {
  const matched = adminSections.find((item) => item.to === route.path);
  return matched?.key ?? "overview";
});

function isAdminSection(...sections: AdminSectionKey[]) {
  return sections.includes(activeAdminSection.value);
}

const logFilter = ref({
  action: "",
  targetType: "",
  operatorId: "",
  startDate: "",
  endDate: "",
  page: "1",
  pageSize: "10",
});

const usersQuery = useQuery({
  queryKey: ["users"],
  queryFn: async () => (await http.get("/users")).data,
  enabled: computed(() => session.isAuthed && canUseCoreAdmin.value)
});

const studentsQuery = useQuery({
  queryKey: ["students"],
  queryFn: async () => (await http.get("/students")).data,
  enabled: computed(() => session.isAuthed && canUseCoreAdmin.value)
});

const profileChangeRequestsQuery = useQuery({
  queryKey: ["students", "profile-requests"],
  queryFn: async () => (await http.get("/students/profile-requests")).data,
  enabled: computed(() => session.isAuthed && canUseCoreAdmin.value)
});

const logsQuery = useQuery({
  queryKey: computed(() => ["logs", logFilter.value]),
  queryFn: async () => {
    const params: Record<string, string> = {};
    const f = logFilter.value;
    if (f.action) params.action = f.action;
    if (f.targetType) params.targetType = f.targetType;
    if (f.operatorId) params.operatorId = f.operatorId;
    if (f.startDate) params.startDate = f.startDate;
    if (f.endDate) params.endDate = f.endDate;
    params.page = f.page;
    params.pageSize = f.pageSize;
    return (await http.get("/logs", { params })).data;
  },
  enabled: computed(() => session.isAuthed && canViewAdminAudit.value)
});

const policiesQuery = useQuery({
  queryKey: ["policies"],
  queryFn: async (): Promise<PolicyDoc[]> =>
    (await http.get("/policies", { params: { includeInactive: true } })).data,
  enabled: computed(() => session.isAuthed && canUseCoreAdmin.value)
});

const publishedNoticesQuery = useQuery({
  queryKey: ["notices", "published"],
  queryFn: async () => (await http.get("/notices/published?limit=8")).data,
  enabled: computed(() => session.isAuthed && canUseCoreAdmin.value)
});

const certTemplatesQuery = useQuery({
  queryKey: ["cert-templates"],
  queryFn: async () => (await http.get("/certificates/templates")).data,
  enabled: computed(() => session.isAuthed && canUseCoreAdmin.value)
});

const certificatesQuery = useQuery({
  queryKey: ["certificates"],
  queryFn: async () => (await http.get("/certificates")).data,
  enabled: computed(() => session.isAuthed && canUseCoreAdmin.value)
});

const leagueBranchesQuery = useQuery({
  queryKey: ["league-branches"],
  queryFn: async () => (await http.get("/league-branches")).data,
  enabled: computed(() => session.isAuthed)
});

const businessTemplatesQuery = useQuery({
  queryKey: ["business-templates"],
  queryFn: async () => (await http.get("/business-templates", { params: { includeDisabled: true } })).data,
  enabled: computed(() => session.isAuthed && canUseCoreAdmin.value)
});

const certTemplateForm = ref({
  name: "在读证明",
  type: "ENROLLMENT",
  content: "兹证明{{studentName}}，学号{{studentNo}}，系我校{{grade}}级{{major}}专业{{className}}班学生，目前在校学习。\n\n特此证明。",
  fields: "studentName, studentNo, grade, major, className, date, certNo"
});

const certGenerateForm = ref({
  templateId: "",
  studentId: "",
});

const certTemplateMutation = useMutation({
  mutationFn: async () => {
    const fields = certTemplateForm.value.fields.split(",").map(f => f.trim()).filter(Boolean);
    return (await http.post("/certificates/templates", { ...certTemplateForm.value, fields })).data;
  },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["cert-templates"] });
  }
});

const certGenerateMutation = useMutation({
  mutationFn: async () => (await http.post("/certificates/generate", certGenerateForm.value)).data,
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["certificates"] }),
      queryClient.invalidateQueries({ queryKey: ["logs"] }),
    ]);
  }
});

const certRevokeM = useMutation({
  mutationFn: async (id: string) => (await http.post(`/certificates/${id}/revoke`)).data,
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["certificates"] });
  }
});

const modules = [
  "审批队列",
  "通知发布",
  "学生导入",
  "组织维护",
  "政策维护",
  "模板配置",
  "操作日志"
];

const branchForm = ref({
  name: "2023级软件工程 SE-1 班团支部",
  grade: "2023",
  major: "软件工程",
  className: "SE-1",
  secretaryName: "班团骨干",
  contact: "demo.secretary",
  description: "负责班级团员发展、团学活动、志愿服务和组织生活记录维护。",
  activityPlan: "本月重点推进团学活动考勤复核、入党积极分子材料整理和志愿服务时长汇总。",
  leagueMembers: "24",
  partyApplicants: "6",
  volunteers: "18"
});
const editingBranchId = ref<string | null>(null);

const businessTemplateForm = ref({
  name: "党团发展材料模板",
  category: "党团工作",
  businessType: "PARTY_DEVELOPMENT",
  description: "用于团校培养、积极分子考察和发展对象审查材料归档。",
  fileName: "党团发展材料模板.docx",
  content: "包含思想汇报、培养联系人意见、支部大会记录和阶段审核意见。"
});
const editingBusinessTemplateId = ref<string | null>(null);

const sourceFileName = ref("管理员手动导入.json");
const excelImportFile = ref<File | null>(null);
const importPayload = ref(
  JSON.stringify(
    [
      {
        studentNo: "20230001",
        name: "李明",
        grade: "2023",
        major: "软件工程",
        className: "SE-1",
        politicalState: "League Member",
        tags: ["团员", "服务", "已更新"],
        bio: "通过管理端导入面板更新的学生简介。"
      },
      {
        studentNo: "20230003",
        name: "陈雨",
        grade: "2023",
        major: "软件工程",
        className: "SE-2",
        politicalState: "Masses",
        tags: ["新导入", "创新"],
        honors: [{ title: "创新训练营", year: 2025 }],
        competitions: [{ name: "程序设计竞赛", award: "二等奖" }],
        practices: [{ name: "志愿服务周", hours: 36 }],
        bio: "通过第一版管理端导入流程录入的新学生。"
      }
    ],
    null,
    2
  )
);

function getDefaultPolicyForm() {
  return {
    title: "综合素质测评办法",
    category: "日常管理",
    version: "2026.1",
    sourceFileName: "综合素质测评办法.md",
    contentText: "综合素质测评主要参考思想政治表现、课程学习、社会实践、志愿服务、科研竞赛和集体贡献。学生应按学院通知提交佐证材料，逾期未提交的项目原则上不纳入当期测评。"
  };
}

const policyForm = ref(getDefaultPolicyForm());
const editingPolicyId = ref<string | null>(null);
const policyFile = ref<File | null>(null);

const noticeForm = ref({
  title: "本周学生工作提醒",
  content: "请在周四晚前完成本周周报填报，并及时查看最新政策更新。",
  targetTags: "团员, 科研",
  targetGrades: "2023",
  targetMajors: "软件工程",
  targetClasses: "",
  targetPoliticalStates: ""
});

const importMutation = useMutation({
  mutationFn: async () => {
    const rows = JSON.parse(importPayload.value);

    return (
      await http.post("/students/import", {
        sourceFileName: sourceFileName.value,
        rows
      })
    ).data;
  },
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    ]);
  }
});

const profileChangeReviewMutation = useMutation({
  mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) =>
    (await http.post(`/students/profile-requests/${id}/${action}`, {})).data,
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["students", "profile-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    ]);
  }
});

const profileChangeReviewErrorMessage = computed(() =>
  normalizeError(profileChangeReviewMutation.error.value, "画像审核操作失败。")
);

const pendingProfileChangeCount = computed(
  () =>
    (profileChangeRequestsQuery.data.value ?? []).filter(
      (item: { status: string }) => item.status === "PENDING"
    ).length
);


const excelImportMutation = useMutation({
  mutationFn: async () => {
    if (!excelImportFile.value) {
      throw new Error("请先选择 Excel 文件。");
    }

    const formData = new FormData();
    formData.append("file", excelImportFile.value);

    return (
      await http.post("/students/import/excel", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      })
    ).data;
  },
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    ]);
  }
});

const templateDownloadMutation = useMutation({
  mutationFn: async () => {
    const response = await http.get("/students/import-template", { responseType: "blob" });
    downloadBlob(response.data, "students-import-template.xlsx");
    return true;
  }
});

const studentsExportMutation = useMutation({
  mutationFn: async () => {
    const response = await http.get("/students/export", { responseType: "blob" });
    downloadBlob(response.data, "students-export.xlsx");
    return true;
  },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["logs"] });
  }
});

const branchMutation = useMutation({
  mutationFn: async () => {
    const payload = {
      name: branchForm.value.name,
      grade: branchForm.value.grade,
      major: branchForm.value.major,
      className: branchForm.value.className,
      secretaryName: branchForm.value.secretaryName,
      contact: branchForm.value.contact,
      description: branchForm.value.description,
      activityPlan: branchForm.value.activityPlan,
      memberSummary: {
        leagueMembers: Number(branchForm.value.leagueMembers || 0),
        partyApplicants: Number(branchForm.value.partyApplicants || 0),
        volunteers: Number(branchForm.value.volunteers || 0)
      }
    };

    if (editingBranchId.value) {
      return (await http.patch(`/league-branches/${editingBranchId.value}`, payload)).data;
    }
    return (await http.post("/league-branches", payload)).data;
  },
  onSuccess: async () => {
    editingBranchId.value = null;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["league-branches"] }),
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    ]);
  }
});

const businessTemplateMutation = useMutation({
  mutationFn: async () => {
    if (editingBusinessTemplateId.value) {
      return (
        await http.patch(`/business-templates/${editingBusinessTemplateId.value}`, businessTemplateForm.value)
      ).data;
    }
    return (await http.post("/business-templates", businessTemplateForm.value)).data;
  },
  onSuccess: async () => {
    editingBusinessTemplateId.value = null;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["business-templates"] }),
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    ]);
  }
});

const businessTemplateStatusMutation = useMutation({
  mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) =>
    (await http.post(`/business-templates/${id}/${enabled ? "enable" : "disable"}`)).data,
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["business-templates"] }),
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    ]);
  }
});

const policyExportMutation = useMutation({
  mutationFn: async () => {
    const response = await http.get("/policies/export", { responseType: "blob" });
    downloadBlob(response.data, "policies-export.xlsx");
    return true;
  },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["logs"] });
  }
});

const logsExportMutation = useMutation({
  mutationFn: async () => {
    const params: Record<string, string> = {};
    const f = logFilter.value;
    if (f.action) params.action = f.action;
    if (f.targetType) params.targetType = f.targetType;
    if (f.operatorId) params.operatorId = f.operatorId;
    if (f.startDate) params.startDate = f.startDate;
    if (f.endDate) params.endDate = f.endDate;
    const response = await http.get("/logs/export", { params, responseType: "blob" });
    downloadBlob(response.data, `operation-logs-${Date.now()}.xlsx`);
    return true;
  }
});

const policyMutation = useMutation({
  mutationFn: async () => {
    if (editingPolicyId.value) {
      if (policyFile.value) {
        throw new Error("编辑已有政策时不替换附件；如需新增附件版本，请取消编辑后重新上传。");
      }

      return (
        await http.patch(`/policies/${editingPolicyId.value}`, {
          ...policyForm.value
        })
      ).data;
    }

    if (!policyFile.value) {
      return (
        await http.post("/policies", {
          ...policyForm.value
        })
      ).data;
    }

    const formData = new FormData();
    formData.append("file", policyFile.value);
    formData.append("title", policyForm.value.title);
    formData.append("category", policyForm.value.category);
    formData.append("version", policyForm.value.version);
    formData.append("sourceFileName", policyForm.value.sourceFileName || policyFile.value.name);
    formData.append("contentText", policyForm.value.contentText);

    return (
      await http.post("/policies/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      })
    ).data;
  },
  onSuccess: async () => {
    policyFile.value = null;
    editingPolicyId.value = null;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["policies"] }),
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    ]);
  }
});

const policyStatusMutation = useMutation({
  mutationFn: async ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) => {
    const endpoint = status === "ACTIVE" ? "activate" : "deactivate";
    return (await http.post(`/policies/${id}/${endpoint}`)).data;
  },
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["policies"] }),
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    ]);
  }
});

const noticeMutation = useMutation({
  mutationFn: async () =>
    (
      await http.post("/notices/publish", {
        title: noticeForm.value.title,
        content: noticeForm.value.content,
        targetTags: parseCommaList(noticeForm.value.targetTags),
        targetGrades: parseCommaList(noticeForm.value.targetGrades),
        targetMajors: parseCommaList(noticeForm.value.targetMajors),
        targetClasses: parseCommaList(noticeForm.value.targetClasses),
        targetPoliticalStates: parseCommaList(noticeForm.value.targetPoliticalStates)
      })
    ).data,
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notices", "published"] }),
      queryClient.invalidateQueries({ queryKey: ["logs"] })
    ]);
  }
});

const importErrorMessage = computed(() => {
  const error = importMutation.error.value;
  return normalizeError(error, "导入请求失败。");
});

const excelImportErrorMessage = computed(() =>
  normalizeError(excelImportMutation.error.value, "Excel 导入请求失败。")
);

const templateDownloadErrorMessage = computed(() =>
  normalizeError(templateDownloadMutation.error.value, "导入模板下载失败。")
);

const studentsExportErrorMessage = computed(() =>
  normalizeError(studentsExportMutation.error.value, "学生数据导出失败。")
);

const branchErrorMessage = computed(() =>
  normalizeError(branchMutation.error.value, "班团组织保存失败。")
);

const businessTemplateErrorMessage = computed(() =>
  normalizeError(businessTemplateMutation.error.value, "业务模板保存失败。")
);

const policyErrorMessage = computed(() =>
  normalizeError(policyMutation.error.value, "政策请求失败。")
);

const policyExportErrorMessage = computed(() =>
  normalizeError(policyExportMutation.error.value, "政策台账导出失败。")
);

const noticeErrorMessage = computed(() =>
  normalizeError(noticeMutation.error.value, "通知请求失败。")
);

const roleLabels: Record<string, string> = {
  admin: "管理员",
  teacher: "教师",
  leader: "领导",
  student: "学生",
  league_secretary: "班团骨干"
};

const channelLabels: Record<string, string> = {
  IN_APP: "站内通知",
  EMAIL: "邮件通知",
  WECHAT: "微信通知"
};

const logActionLabels: Record<string, string> = {
  "students.import": "学生导入",
  "students.template.download": "下载学生导入模板",
  "students.export": "导出学生数据",
  "students.profile_change.submit": "提交画像变更",
  "students.profile_change.approve": "通过画像变更",
  "students.profile_change.reject": "驳回画像变更",
  "league_branches.create": "新增班团组织",
  "league_branches.update": "更新班团组织",
  "business_templates.create": "新增业务模板",
  "business_templates.update": "更新业务模板",
  "business_templates.enable": "启用业务模板",
  "business_templates.disable": "停用业务模板",
  "policies.create": "新增政策",
  "policies.upload": "上传政策附件",
  "policies.update": "编辑政策",
  "policies.activate": "启用政策",
  "policies.deactivate": "停用政策",
  "policies.export": "导出政策台账",
  "notices.publish": "发布通知",
  "approvals.create": "创建审批",
  "approvals.submit": "提交审批",
  "approvals.approved": "审批通过",
  "approvals.rejected": "审批驳回",
  "approvals.returned": "退回审批",
  "files.upload": "上传附件",
  "notices.system": "系统通知"
};

function getRoleLabel(role: string) {
  return roleLabels[role] ?? role;
}

function formatLogDetail(detail: Record<string, unknown> | null | undefined) {
  if (!detail) {
    return "无附加详情";
  }

  const parts: string[] = [];

  if (typeof detail.title === "string") {
    parts.push(`标题：${detail.title}`);
  }
  if (typeof detail.category === "string") {
    parts.push(`分类：${detail.category}`);
  }
  if (typeof detail.version === "string") {
    parts.push(`版本：${detail.version}`);
  }
  if (typeof detail.rows === "number") {
    parts.push(`导入条数：${detail.rows}`);
  }
  if (typeof detail.created === "number") {
    parts.push(`新增：${detail.created}`);
  }
  if (typeof detail.updated === "number") {
    parts.push(`更新：${detail.updated}`);
  }
  if (typeof detail.recipientCount === "number") {
    parts.push(`接收人数：${detail.recipientCount}`);
  }
  if (typeof detail.channel === "string") {
    parts.push(`渠道：${channelLabels[detail.channel] ?? detail.channel}`);
  }
  if (typeof detail.sourceFileName === "string") {
    parts.push(`来源文件：${detail.sourceFileName}`);
  }
  if (typeof detail.hasContentText === "boolean") {
    parts.push(detail.hasContentText ? "已录入正文摘要" : "未录入正文摘要");
  }
  if (typeof detail.type === "string") {
    parts.push(`类型：${detail.type}`);
  }
  if (typeof detail.status === "string") {
    parts.push(`状态：${detail.status}`);
  }
  if (typeof detail.stepNo === "number") {
    parts.push(`节点：${detail.stepNo}`);
  }
  if (typeof detail.fileName === "string") {
    parts.push(`附件：${detail.fileName}`);
  }
  if (typeof detail.attachmentId === "string") {
    parts.push(`附件编号：${detail.attachmentId}`);
  }
  if (typeof detail.name === "string") {
    parts.push(`名称：${detail.name}`);
  }
  if (typeof detail.grade === "string") {
    parts.push(`年级：${detail.grade}`);
  }
  if (typeof detail.major === "string") {
    parts.push(`专业：${detail.major}`);
  }
  if (typeof detail.className === "string") {
    parts.push(`班级：${detail.className}`);
  }

  return parts.length > 0 ? parts.join("，") : "无附加详情";
}

function normalizeError(error: unknown, fallback: string) {
  if (!error) {
    return "";
  }

  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      return message.join("；");
    }
    if (typeof message === "string" && message.trim()) {
      return message;
    }
    if (typeof error.response?.data?.error === "string") {
      return error.response.data.error;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function handleExcelFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  excelImportFile.value = input.files?.[0] ?? null;
}

function handlePolicyFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (editingPolicyId.value) {
    input.value = "";
    policyFile.value = null;
    return;
  }

  policyFile.value = input.files?.[0] ?? null;
  if (policyFile.value) {
    policyForm.value.sourceFileName = policyFile.value.name;
  }
}

function startEditPolicy(policy: PolicyDoc) {
  editingPolicyId.value = policy.id;
  policyFile.value = null;
  policyForm.value = {
    title: policy.title,
    category: policy.category,
    version: policy.version,
    sourceFileName: policy.sourceFileName,
    contentText: policy.contentText ?? ""
  };
}

function copyPolicyAsNewVersion(policy: PolicyDoc) {
  editingPolicyId.value = null;
  policyFile.value = null;
  policyForm.value = {
    title: policy.title,
    category: policy.category,
    version: `${policy.version}.new`,
    sourceFileName: policy.sourceFileName,
    contentText: policy.contentText ?? ""
  };
}

function resetPolicyForm() {
  editingPolicyId.value = null;
  policyFile.value = null;
  policyForm.value = getDefaultPolicyForm();
}

function startEditBranch(branch: {
  id: string;
  name: string;
  grade: string;
  major: string;
  className: string;
  secretaryName?: string | null;
  contact?: string | null;
  description?: string | null;
  activityPlan?: string | null;
  memberSummary?: Record<string, unknown> | null;
}) {
  editingBranchId.value = branch.id;
  branchForm.value = {
    name: branch.name,
    grade: branch.grade,
    major: branch.major,
    className: branch.className,
    secretaryName: branch.secretaryName ?? "",
    contact: branch.contact ?? "",
    description: branch.description ?? "",
    activityPlan: branch.activityPlan ?? "",
    leagueMembers: String(branch.memberSummary?.leagueMembers ?? ""),
    partyApplicants: String(branch.memberSummary?.partyApplicants ?? ""),
    volunteers: String(branch.memberSummary?.volunteers ?? "")
  };
}

function resetBranchForm() {
  editingBranchId.value = null;
  branchForm.value = {
    name: "2023级软件工程 SE-1 班团支部",
    grade: "2023",
    major: "软件工程",
    className: "SE-1",
    secretaryName: "班团骨干",
    contact: "demo.secretary",
    description: "负责班级团员发展、团学活动、志愿服务和组织生活记录维护。",
    activityPlan: "本月重点推进团学活动考勤复核、入党积极分子材料整理和志愿服务时长汇总。",
    leagueMembers: "24",
    partyApplicants: "6",
    volunteers: "18"
  };
}

function startEditBusinessTemplate(template: {
  id: string;
  name: string;
  category: string;
  businessType: string;
  description?: string | null;
  fileName?: string | null;
  content?: string | null;
}) {
  editingBusinessTemplateId.value = template.id;
  businessTemplateForm.value = {
    name: template.name,
    category: template.category,
    businessType: template.businessType,
    description: template.description ?? "",
    fileName: template.fileName ?? "",
    content: template.content ?? ""
  };
}

function resetBusinessTemplateForm() {
  editingBusinessTemplateId.value = null;
  businessTemplateForm.value = {
    name: "党团发展材料模板",
    category: "党团工作",
    businessType: "PARTY_DEVELOPMENT",
    description: "用于团校培养、积极分子考察和发展对象审查材料归档。",
    fileName: "党团发展材料模板.docx",
    content: "包含思想汇报、培养联系人意见、支部大会记录和阶段审核意见。"
  };
}

function getPolicyStatusLabel(status: string) {
  return status === "INACTIVE" ? "已停用" : "启用中";
}

function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function downloadBlob(blobPart: BlobPart, fileName: string) {
  const blob = new Blob([blobPart]);
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
</script>

<template>
  <AppShell title="管理工作台" subtitle="处理学生导入、政策维护、通知发布和日志追踪。" :links="links">
    <div class="summary-grid">
      <article class="summary-card">
        <strong>用户数</strong>
        <span>{{ usersQuery.data.value?.length ?? 0 }}</span>
      </article>
      <article class="summary-card">
        <strong>学生数</strong>
        <span>{{ studentsQuery.data.value?.length ?? 0 }}</span>
      </article>
      <article class="summary-card">
        <strong>最近日志</strong>
        <span>{{ logsQuery.data.value?.length ?? 0 }}</span>
      </article>
      <article class="summary-card">
        <strong>政策数</strong>
        <span>{{ policiesQuery.data.value?.length ?? 0 }}</span>
      </article>
      <article class="summary-card">
        <strong>已发布通知</strong>
        <span>{{ publishedNoticesQuery.data.value?.length ?? 0 }}</span>
      </article>
    </div>

    <div class="module-list">
      <article v-for="user in usersQuery.data.value ?? []" :key="user.id" class="module-card">
        <strong>{{ user.displayName }}</strong>
        <span>{{ user.username }} | {{ user.roles.map(getRoleLabel).join("、") }}</span>
      </article>
    </div>

    <nav class="admin-section-nav" aria-label="管理端功能导航">
      <RouterLink
        v-for="section in adminSections"
        :key="section.key"
        :to="section.to"
        :class="{ active: activeAdminSection === section.key }"
      >
        {{ section.label }}
      </RouterLink>
    </nav>

    <section v-if="isAdminSection('students')" class="import-panel">
      <div class="panel-heading">
        <div>
          <strong>学生导入</strong>
          <span>支持 Excel 文件导入；JSON 导入保留为结构化数据校验通道。</span>
        </div>
          <button type="button" class="primary-button" :disabled="excelImportMutation.isPending.value || !excelImportFile" @click="excelImportMutation.mutate()">
            {{ excelImportMutation.isPending.value ? "导入中..." : "导入 Excel" }}
          </button>
        </div>

        <div class="action-row">
          <button type="button" class="secondary-button" :disabled="templateDownloadMutation.isPending.value" @click="templateDownloadMutation.mutate()">
            {{ templateDownloadMutation.isPending.value ? "下载中..." : "下载导入模板" }}
          </button>
          <button type="button" class="secondary-button" :disabled="studentsExportMutation.isPending.value" @click="studentsExportMutation.mutate()">
            {{ studentsExportMutation.isPending.value ? "导出中..." : "导出学生数据" }}
          </button>
        </div>

      <label class="field">
        <span>Excel 文件</span>
        <input type="file" accept=".xlsx" @change="handleExcelFileChange" />
      </label>

      <p class="status-line">
        Excel 表头支持：学号、姓名、年级、专业、班级、政治面貌、状态、简介、标签、荣誉、竞赛、实践；支持 .xlsx，单文件不超过 30MB。
      </p>

      <p v-if="excelImportMutation.data.value" class="status-line success">
        Excel 已处理 {{ excelImportMutation.data.value.imported }} 条：
        新增 {{ excelImportMutation.data.value.created }} 条，
        更新 {{ excelImportMutation.data.value.updated }} 条，
        新增画像 {{ excelImportMutation.data.value.profilesCreated }} 条，
        更新画像 {{ excelImportMutation.data.value.profilesUpdated }} 条。
      </p>
      <p v-if="excelImportErrorMessage" class="status-line error">
        {{ excelImportErrorMessage }}
      </p>
      <p v-if="templateDownloadErrorMessage" class="status-line error">
        {{ templateDownloadErrorMessage }}
      </p>
      <p v-if="studentsExportErrorMessage" class="status-line error">
        {{ studentsExportErrorMessage }}
      </p>

      <label class="field">
        <span>来源文件名</span>
        <input v-model="sourceFileName" type="text" />
      </label>

      <label class="field">
        <span>导入数据内容</span>
        <textarea v-model="importPayload" rows="14" spellcheck="false" />
      </label>

      <button type="button" class="secondary-button" :disabled="importMutation.isPending.value" @click="importMutation.mutate()">
        {{ importMutation.isPending.value ? "校验导入中..." : "执行 JSON 导入" }}
      </button>

      <p v-if="importMutation.data.value" class="status-line success">
        已处理 {{ importMutation.data.value.imported }} 条：
        新增 {{ importMutation.data.value.created }} 条，
        更新 {{ importMutation.data.value.updated }} 条，
        新增画像 {{ importMutation.data.value.profilesCreated }} 条，
        更新画像 {{ importMutation.data.value.profilesUpdated }} 条。
      </p>
      <p v-if="importErrorMessage" class="status-line error">
        {{ importErrorMessage }}
      </p>

      <section class="module-card compact-card">
        <div class="policy-card-heading">
          <strong>画像变更审核</strong>
          <span>待审 {{ pendingProfileChangeCount }}</span>
        </div>
        <p v-if="profileChangeReviewErrorMessage" class="status-line error">
          {{ profileChangeReviewErrorMessage }}
        </p>
        <article
          v-for="request in profileChangeRequestsQuery.data.value ?? []"
          :key="request.id"
          class="module-card compact-card"
        >
          <strong>{{ request.student.name }}（{{ request.student.studentNo }}）</strong>
          <span>
            {{ request.status === "PENDING" ? "待审核" : request.status === "APPROVED" ? "已通过" : "已驳回" }}
            | {{ request.createdAt }}
          </span>
          <span v-if="request.requestedData.bio">简介：{{ request.requestedData.bio }}</span>
          <span v-if="request.requestedData.tags?.length">标签：{{ request.requestedData.tags.join("、") }}</span>
          <div v-if="request.status === 'PENDING'" class="action-row">
            <button
              type="button"
              class="secondary-button"
              :disabled="profileChangeReviewMutation.isPending.value"
              @click="profileChangeReviewMutation.mutate({ id: request.id, action: 'approve' })"
            >
              通过
            </button>
            <button
              type="button"
              class="secondary-button"
              :disabled="profileChangeReviewMutation.isPending.value"
              @click="profileChangeReviewMutation.mutate({ id: request.id, action: 'reject' })"
            >
              驳回
            </button>
          </div>
        </article>
      </section>
    </section>

    <section v-if="isAdminSection('organizations')" class="dual-panel">
      <section class="import-panel">
        <div class="panel-heading">
          <div>
            <strong>班团组织维护</strong>
            <span>班团骨干可维护本人负责班级，管理员和教师可维护全部班团组织。</span>
          </div>
          <button type="button" class="primary-button" :disabled="branchMutation.isPending.value" @click="branchMutation.mutate()">
            {{ branchMutation.isPending.value ? "保存中..." : editingBranchId ? "保存组织" : "新增组织" }}
          </button>
        </div>

        <div v-if="editingBranchId" class="action-row">
          <span class="status-line">正在编辑已有班团组织。</span>
          <button type="button" class="secondary-button" @click="resetBranchForm">取消编辑</button>
        </div>

        <label class="field">
          <span>组织名称</span>
          <input v-model="branchForm.name" type="text" />
        </label>
        <div class="filter-grid">
          <label class="field">
            <span>年级</span>
            <input v-model="branchForm.grade" type="text" />
          </label>
          <label class="field">
            <span>专业</span>
            <input v-model="branchForm.major" type="text" />
          </label>
          <label class="field">
            <span>班级</span>
            <input v-model="branchForm.className" type="text" />
          </label>
        </div>
        <div class="filter-grid">
          <label class="field">
            <span>负责人</span>
            <input v-model="branchForm.secretaryName" type="text" />
          </label>
          <label class="field">
            <span>联系方式</span>
            <input v-model="branchForm.contact" type="text" />
          </label>
        </div>
        <label class="field">
          <span>组织说明</span>
          <textarea v-model="branchForm.description" rows="5" />
        </label>
        <label class="field">
          <span>近期工作计划</span>
          <textarea v-model="branchForm.activityPlan" rows="5" />
        </label>
        <div class="filter-grid">
          <label class="field">
            <span>团员数</span>
            <input v-model="branchForm.leagueMembers" type="number" min="0" />
          </label>
          <label class="field">
            <span>入党积极分子</span>
            <input v-model="branchForm.partyApplicants" type="number" min="0" />
          </label>
          <label class="field">
            <span>志愿服务骨干</span>
            <input v-model="branchForm.volunteers" type="number" min="0" />
          </label>
        </div>

        <p v-if="branchMutation.data.value" class="status-line success">
          已保存班团组织：{{ branchMutation.data.value.name }}。
        </p>
        <p v-if="branchErrorMessage" class="status-line error">{{ branchErrorMessage }}</p>
      </section>

      <section class="import-panel">
        <div class="panel-heading">
          <div>
            <strong>组织信息台账</strong>
            <span>展示班团组织、负责人、成员绑定和近期计划。</span>
          </div>
        </div>
        <article v-for="branch in leagueBranchesQuery.data.value ?? []" :key="branch.id" class="module-card compact-card">
          <div class="policy-card-heading">
            <strong>{{ branch.name }}</strong>
            <span class="policy-status">{{ branch.memberCount }} 人</span>
          </div>
          <span>{{ branch.grade }} | {{ branch.major }} | {{ branch.className }}</span>
          <span>负责人：{{ branch.secretaryName ?? "未填写" }} | {{ branch.contact ?? "无联系方式" }}</span>
          <span v-if="branch.description">说明：{{ branch.description }}</span>
          <span v-if="branch.activityPlan">计划：{{ branch.activityPlan }}</span>
          <span v-if="branch.memberSummary">
            团员 {{ branch.memberSummary.leagueMembers ?? 0 }}，
            入党积极分子 {{ branch.memberSummary.partyApplicants ?? 0 }}，
            志愿服务骨干 {{ branch.memberSummary.volunteers ?? 0 }}
          </span>
          <div class="action-row">
            <button type="button" class="secondary-button" @click="startEditBranch(branch)">编辑</button>
          </div>
        </article>
      </section>
    </section>

    <section v-if="isAdminSection('templates')" class="dual-panel">
      <section class="import-panel">
        <div class="panel-heading">
          <div>
            <strong>业务模板配置</strong>
            <span>按业务类型维护材料模板、说明和下载文件名，补齐模板配置闭环。</span>
          </div>
          <button type="button" class="primary-button" :disabled="businessTemplateMutation.isPending.value" @click="businessTemplateMutation.mutate()">
            {{ businessTemplateMutation.isPending.value ? "保存中..." : editingBusinessTemplateId ? "保存模板" : "新增模板" }}
          </button>
        </div>

        <div v-if="editingBusinessTemplateId" class="action-row">
          <span class="status-line">正在编辑已有业务模板。</span>
          <button type="button" class="secondary-button" @click="resetBusinessTemplateForm">取消编辑</button>
        </div>

        <label class="field">
          <span>模板名称</span>
          <input v-model="businessTemplateForm.name" type="text" />
        </label>
        <div class="filter-grid">
          <label class="field">
            <span>模板分类</span>
            <input v-model="businessTemplateForm.category" type="text" />
          </label>
          <label class="field">
            <span>业务类型编码</span>
            <input v-model="businessTemplateForm.businessType" type="text" />
          </label>
        </div>
        <label class="field">
          <span>模板文件名</span>
          <input v-model="businessTemplateForm.fileName" type="text" />
        </label>
        <label class="field">
          <span>模板说明</span>
          <textarea v-model="businessTemplateForm.description" rows="5" />
        </label>
        <label class="field">
          <span>模板内容摘要</span>
          <textarea v-model="businessTemplateForm.content" rows="6" />
        </label>

        <p v-if="businessTemplateMutation.data.value" class="status-line success">
          已保存业务模板：{{ businessTemplateMutation.data.value.name }}。
        </p>
        <p v-if="businessTemplateErrorMessage" class="status-line error">{{ businessTemplateErrorMessage }}</p>
      </section>

      <section class="import-panel">
        <div class="panel-heading">
          <div>
            <strong>模板台账</strong>
            <span>可编辑、启用或停用业务模板。</span>
          </div>
        </div>
        <article v-for="template in businessTemplatesQuery.data.value ?? []" :key="template.id" class="module-card compact-card">
          <div class="policy-card-heading">
            <strong>{{ template.name }}</strong>
            <span :class="['policy-status', template.enabled ? '' : 'is-muted']">
              {{ template.enabled ? "启用中" : "已停用" }}
            </span>
          </div>
          <span>{{ template.category }} | {{ template.businessType }} | {{ template.fileName ?? "未绑定文件" }}</span>
          <span v-if="template.description">{{ template.description }}</span>
          <span v-if="template.content">摘要：{{ template.content }}</span>
          <div class="action-row">
            <button type="button" class="secondary-button" @click="startEditBusinessTemplate(template)">编辑</button>
            <button
              type="button"
              class="secondary-button"
              :disabled="businessTemplateStatusMutation.isPending.value"
              @click="businessTemplateStatusMutation.mutate({ id: template.id, enabled: !template.enabled })"
            >
              {{ template.enabled ? "停用" : "启用" }}
            </button>
          </div>
        </article>
      </section>
    </section>

    <section v-if="isAdminSection('policies', 'notices')" class="dual-panel">
      <section v-if="isAdminSection('policies')" class="import-panel">
        <div class="panel-heading">
          <div>
            <strong>政策知识库</strong>
            <span>录入或上传政策文件，用于检索、问答提示和学生端来源溯源。</span>
          </div>
          <div class="action-row">
            <button type="button" class="secondary-button" :disabled="policyExportMutation.isPending.value" @click="policyExportMutation.mutate()">
              {{ policyExportMutation.isPending.value ? "导出中..." : "导出政策台账" }}
            </button>
            <button type="button" class="primary-button" :disabled="policyMutation.isPending.value" @click="policyMutation.mutate()">
              {{ policyMutation.isPending.value ? "保存中..." : editingPolicyId ? "保存政策" : policyFile ? "上传政策附件" : "新增政策" }}
            </button>
          </div>
        </div>

        <div v-if="editingPolicyId" class="action-row">
          <span class="status-line">正在编辑已有政策；保存后会覆盖该政策元信息。</span>
          <button type="button" class="secondary-button" @click="resetPolicyForm">取消编辑</button>
        </div>

        <div class="upload-zone">
          <label class="upload-picker">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,image/png,image/jpeg,image/webp"
              :disabled="Boolean(editingPolicyId)"
              @change="handlePolicyFileChange"
            />
            <span>选择政策附件</span>
            <strong>{{ editingPolicyId ? "编辑政策时不替换附件" : policyFile?.name ?? "支持 PDF / Word / Excel / 图片 / TXT / MD" }}</strong>
          </label>
          <p>选择文件后点击右上角“上传政策附件”；不选择文件时可直接新增政策记录。</p>
        </div>

        <label class="field">
          <span>标题</span>
          <input v-model="policyForm.title" type="text" />
        </label>
        <label class="field">
          <span>分类</span>
          <input v-model="policyForm.category" type="text" />
        </label>
        <label class="field">
          <span>版本</span>
          <input v-model="policyForm.version" type="text" />
        </label>
        <label class="field">
          <span>来源文件名</span>
          <input v-model="policyForm.sourceFileName" type="text" />
        </label>
        <label class="field">
          <span>正文摘要/政策要点</span>
          <textarea
            v-model="policyForm.contentText"
            rows="8"
            placeholder="录入政策正文摘要、适用对象、办理条件和关键流程，用于学生端政策问答匹配。"
          />
        </label>
        <p class="status-line">
          可上传 PDF、Word、Excel、图片或纯文本政策附件，单文件不超过 30MB；TXT/MD 会自动提取正文，手动录入的正文摘要优先用于问答匹配。
        </p>

        <p v-if="policyMutation.data.value" class="status-line success">
          已保存《{{ policyMutation.data.value.title }}》({{ policyMutation.data.value.version }})，来源：{{ policyMutation.data.value.sourceFileName }}。
        </p>
        <p v-if="policyErrorMessage" class="status-line error">
          {{ policyErrorMessage }}
        </p>
        <p v-if="policyExportErrorMessage" class="status-line error">
          {{ policyExportErrorMessage }}
        </p>

        <article v-for="policy in policiesQuery.data.value ?? []" :key="policy.id" class="module-card compact-card">
          <div class="policy-card-heading">
            <strong>{{ policy.title }}</strong>
            <span :class="['policy-status', policy.status === 'INACTIVE' ? 'is-muted' : '']">
              {{ getPolicyStatusLabel(policy.status) }}
            </span>
          </div>
          <span>{{ policy.category }} | {{ policy.version }} | {{ policy.updatedAt }}</span>
          <span>{{ policy.sourceFileName }}</span>
          <span v-if="policy.contentText">要点：{{ policy.contentText.slice(0, 120) }}{{ policy.contentText.length > 120 ? "..." : "" }}</span>
          <div class="action-row">
            <button type="button" class="secondary-button" @click="startEditPolicy(policy)">编辑</button>
            <button type="button" class="secondary-button" @click="copyPolicyAsNewVersion(policy)">复制新版</button>
            <button
              type="button"
              class="secondary-button"
              :disabled="policyStatusMutation.isPending.value"
              @click="policyStatusMutation.mutate({ id: policy.id, status: policy.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE' })"
            >
              {{ policy.status === "INACTIVE" ? "启用" : "停用" }}
            </button>
          </div>
        </article>
      </section>

      <section v-if="isAdminSection('notices')" class="import-panel">
        <div class="panel-heading">
          <div>
            <strong>通知发布</strong>
            <span>按年级、专业、班级、政治面貌和标签组合定向发布；筛选留空时面向全部学生。</span>
          </div>
          <button type="button" class="primary-button" :disabled="noticeMutation.isPending.value" @click="noticeMutation.mutate()">
            {{ noticeMutation.isPending.value ? "发布中..." : "发布通知" }}
          </button>
        </div>

        <label class="field">
          <span>标题</span>
          <input v-model="noticeForm.title" type="text" />
        </label>
        <label class="field">
          <span>目标标签</span>
          <input v-model="noticeForm.targetTags" type="text" />
        </label>
        <div class="filter-grid">
          <label class="field">
            <span>目标年级</span>
            <input v-model="noticeForm.targetGrades" type="text" placeholder="例如：2023, 2024" />
          </label>
          <label class="field">
            <span>目标专业</span>
            <input v-model="noticeForm.targetMajors" type="text" placeholder="例如：软件工程" />
          </label>
          <label class="field">
            <span>目标班级</span>
            <input v-model="noticeForm.targetClasses" type="text" placeholder="例如：SE-1" />
          </label>
          <label class="field">
            <span>政治面貌</span>
            <input v-model="noticeForm.targetPoliticalStates" type="text" placeholder="例如：League Member" />
          </label>
        </div>
        <label class="field">
          <span>通知内容</span>
          <textarea v-model="noticeForm.content" rows="8" spellcheck="false" />
        </label>

        <p v-if="noticeMutation.data.value" class="status-line success">
          《{{ noticeMutation.data.value.title }}》已发布，接收人数 {{ noticeMutation.data.value.recipientCount }}。
        </p>
        <p v-if="noticeErrorMessage" class="status-line error">
          {{ noticeErrorMessage }}
        </p>

        <article v-for="notice in publishedNoticesQuery.data.value ?? []" :key="notice.id" class="module-card compact-card">
          <strong>{{ notice.title }}</strong>
          <span>
            {{ channelLabels[notice.channel] ?? notice.channel }} | 接收 {{ notice.recipientCount }} |
            已读 {{ notice.readCount ?? 0 }} | 未读 {{ notice.unreadCount ?? notice.recipientCount }}
          </span>
          <span>{{ notice.content }}</span>
        </article>
      </section>
    </section>

    <div v-if="isAdminSection('overview')" class="module-grid">
      <article v-for="item in modules" :key="item" class="module-card">
        <strong>{{ item }}</strong>
        <span>已接入基础数据能力，筛选、分页和批量操作按验收优先级继续收敛。</span>
      </article>
    </div>

    <section v-if="isAdminSection('certificates')" class="dual-panel">
      <section class="import-panel">
        <div class="panel-heading">
          <div>
            <strong>证明模板管理</strong>
            <span>创建证明模板，支持变量占位符（如 &#123;&#123;studentName&#125;&#125;）。</span>
          </div>
          <button type="button" class="primary-button" :disabled="certTemplateMutation.isPending.value" @click="certTemplateMutation.mutate()">
            {{ certTemplateMutation.isPending.value ? "保存中..." : "创建模板" }}
          </button>
        </div>
        <label class="field">
          <span>模板名称</span>
          <input v-model="certTemplateForm.name" type="text" />
        </label>
        <label class="field">
          <span>类型编码</span>
          <input v-model="certTemplateForm.type" type="text" placeholder="如 ENROLLMENT, AWARD" />
        </label>
        <label class="field">
          <span>模板内容</span>
          <textarea v-model="certTemplateForm.content" rows="5" />
        </label>
        <label class="field">
          <span>变量字段（逗号分隔）</span>
          <input v-model="certTemplateForm.fields" type="text" />
        </label>
        <article v-for="tpl in certTemplatesQuery.data.value ?? []" :key="tpl.id" class="module-card compact-card">
          <strong>{{ tpl.name }}</strong>
          <span>类型：{{ tpl.type }} | 字段：{{ tpl.fields.join(", ") }}</span>
        </article>
      </section>

      <section class="import-panel">
        <div class="panel-heading">
          <div>
            <strong>生成电子证明</strong>
            <span>选择模板和学生，生成带编号的电子证明。</span>
          </div>
          <button type="button" class="primary-button" :disabled="certGenerateMutation.isPending.value" @click="certGenerateMutation.mutate()">
            {{ certGenerateMutation.isPending.value ? "生成中..." : "生成证明" }}
          </button>
        </div>
        <label class="field">
          <span>选择模板</span>
          <select v-model="certGenerateForm.templateId">
            <option value="">请选择模板</option>
            <option v-for="tpl in certTemplatesQuery.data.value ?? []" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>选择学生</span>
          <select v-model="certGenerateForm.studentId">
            <option value="">请选择学生</option>
            <option v-for="stu in studentsQuery.data.value ?? []" :key="stu.id" :value="stu.id">{{ stu.name }}（{{ stu.studentNo }}）</option>
          </select>
        </label>
        <p v-if="certGenerateMutation.data.value" class="status-line success">
          已生成证明：{{ certGenerateMutation.data.value.certNo }}
        </p>
        <article v-for="cert in certificatesQuery.data.value ?? []" :key="cert.id" class="module-card compact-card">
          <div class="policy-card-heading">
            <strong>{{ cert.title }} - {{ cert.studentName }}</strong>
            <span :class="['policy-status', cert.status === 'REVOKED' ? 'is-muted' : '']">{{ cert.status === "REVOKED" ? "已撤销" : "有效" }}</span>
          </div>
          <span>编号：{{ cert.certNo }} | {{ new Date(cert.issuedAt).toLocaleDateString("zh-CN") }}</span>
          <button v-if="cert.status !== 'REVOKED'" type="button" class="secondary-button" @click="certRevokeM.mutate(cert.id)">撤销</button>
        </article>
      </section>
    </section>

    <section v-if="isAdminSection('logs')" class="import-panel">
      <div class="panel-heading">
        <div>
          <strong>操作日志</strong>
          <span>支持按操作类型、对象类型、时间范围筛选，并可导出 Excel。</span>
        </div>
        <button type="button" class="secondary-button" :disabled="logsExportMutation.isPending.value" @click="logsExportMutation.mutate()">
          {{ logsExportMutation.isPending.value ? "导出中..." : "导出日志" }}
        </button>
      </div>

      <div class="filter-grid">
        <label class="field">
          <span>操作类型</span>
          <input v-model="logFilter.action" type="text" placeholder="如 students.import" />
        </label>
        <label class="field">
          <span>对象类型</span>
          <input v-model="logFilter.targetType" type="text" placeholder="如 Student" />
        </label>
        <label class="field">
          <span>开始时间</span>
          <input v-model="logFilter.startDate" type="date" />
        </label>
        <label class="field">
          <span>结束时间</span>
          <input v-model="logFilter.endDate" type="date" />
        </label>
      </div>

      <article v-for="log in (logsQuery.data.value?.data ?? [])" :key="log.id" class="module-card compact-card">
        <strong>{{ logActionLabels[log.action] ?? log.action }}</strong>
        <span>{{ log.operator?.displayName ?? "系统" }} | {{ log.createdAt }}</span>
        <span>{{ formatLogDetail(log.detail) }}</span>
      </article>

      <div v-if="logsQuery.data.value" class="action-row">
        <button type="button" class="secondary-button" :disabled="Number(logFilter.page) <= 1" @click="logFilter.page = String(Number(logFilter.page) - 1)">上一页</button>
        <span class="status-line">第 {{ logsQuery.data.value.page }} 页 / 共 {{ Math.ceil(logsQuery.data.value.total / logsQuery.data.value.pageSize) }} 页（{{ logsQuery.data.value.total }} 条）</span>
        <button type="button" class="secondary-button" :disabled="Number(logFilter.page) >= Math.ceil(logsQuery.data.value.total / logsQuery.data.value.pageSize)" @click="logFilter.page = String(Number(logFilter.page) + 1)">下一页</button>
      </div>
    </section>
  </AppShell>
</template>

<style scoped>
.summary-grid,
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 18px;
  margin-bottom: 26px;
}

.admin-section-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 26px;
  padding: 14px;
  background: #fffaf2;
  border: 1px solid var(--ruc-line);
  box-shadow: var(--ruc-shadow);
}

.admin-section-nav a {
  padding: 10px 14px;
  border: 1px solid transparent;
  color: var(--ruc-muted);
  text-decoration: none;
  font-weight: 800;
}

.admin-section-nav a.active {
  border-color: rgba(157, 0, 0, 0.28);
  background: rgba(157, 0, 0, 0.08);
  color: var(--ruc-red);
}

.dual-panel,
.module-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
  margin-bottom: 26px;
}

.summary-card,
.module-card {
  display: grid;
  gap: 8px;
  padding: 20px;
  background: var(--ruc-card);
  border: 1px solid var(--ruc-line);
  box-shadow: var(--ruc-shadow);
}

.module-card span {
  color: var(--ruc-muted);
  line-height: 1.65;
}

.module-card strong,
.summary-card strong {
  color: var(--ruc-ink);
}

.summary-card {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(157, 0, 0, 0.08), transparent 62%),
    #fffaf2;
  border-top: 4px solid var(--ruc-red);
}

.summary-card span {
  color: var(--ruc-red);
  font-size: 30px;
  font-weight: 800;
  font-family: Georgia, serif;
}

.import-panel {
  display: grid;
  gap: 16px;
  margin-bottom: 26px;
  padding: 24px;
  background: #fffaf2;
  border: 1px solid var(--ruc-line);
  border-top: 4px solid var(--ruc-red);
  box-shadow: var(--ruc-shadow);
}

.panel-heading {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.panel-heading span,
.field span,
.status-line {
  color: var(--ruc-muted);
}

.panel-heading strong {
  font-size: 22px;
}

.field {
  display: grid;
  gap: 8px;
}

.field input,
.field textarea,
.field select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--ruc-line);
  background: #fffdf8;
  color: var(--ruc-ink);
  font: inherit;
}

.field textarea {
  min-height: 280px;
  resize: vertical;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.upload-zone {
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px dashed var(--ruc-red);
  background: #fff4e8;
}

.upload-zone p {
  margin: 0;
  color: var(--ruc-muted);
}

.upload-picker {
  display: grid;
  gap: 6px;
  cursor: pointer;
}

.upload-picker input {
  width: 100%;
  color: var(--ruc-ink);
  font: inherit;
}

.upload-picker span {
  color: var(--ruc-red);
  font-weight: 800;
}

.upload-picker strong {
  font-size: 18px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.compact-card {
  padding: 16px;
  border: 1px solid var(--ruc-line);
  box-shadow: none;
}

.policy-card-heading {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.policy-status {
  padding: 4px 8px;
  border: 1px solid rgba(29, 104, 65, 0.35);
  color: #1d6841;
  font-size: 13px;
  font-weight: 800;
}

.policy-status.is-muted {
  border-color: rgba(116, 98, 91, 0.35);
  color: var(--ruc-muted);
}

.primary-button {
  border: none;
  padding: 12px 18px;
  background: var(--ruc-red);
  color: #ffffff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.secondary-button {
  justify-self: flex-start;
  border: 1px solid var(--ruc-line);
  padding: 11px 16px;
  background: #fffdf8;
  color: var(--ruc-red);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.status-line {
  margin: 0;
}

.status-line.success {
  color: #1d6841;
}

.status-line.error {
  color: var(--ruc-red);
}

@media (max-width: 900px) {
  .panel-heading {
    flex-direction: column;
  }
}
</style>

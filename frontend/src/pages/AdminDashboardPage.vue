<script setup lang="ts">
import { computed, ref } from "vue";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
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
  status: "ACTIVE" | "INACTIVE";
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

const session = useSessionStore();
session.hydrate();
const queryClient = useQueryClient();

const usersQuery = useQuery({
  queryKey: ["users"],
  queryFn: async () => (await http.get("/users")).data,
  enabled: session.isAuthed
});

const studentsQuery = useQuery({
  queryKey: ["students"],
  queryFn: async () => (await http.get("/students")).data,
  enabled: session.isAuthed
});

const logsQuery = useQuery({
  queryKey: ["logs", "recent"],
  queryFn: async () => (await http.get("/logs/recent?limit=8")).data,
  enabled: session.isAuthed
});

const policiesQuery = useQuery({
  queryKey: ["policies"],
  queryFn: async (): Promise<PolicyDoc[]> =>
    (await http.get("/policies", { params: { includeInactive: true } })).data,
  enabled: session.isAuthed
});

const publishedNoticesQuery = useQuery({
  queryKey: ["notices", "published"],
  queryFn: async () => (await http.get("/notices/published?limit=8")).data,
  enabled: session.isAuthed
});

const modules = [
  "审批队列",
  "通知发布",
  "学生导入",
  "政策维护",
  "操作日志"
];

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
    sourceFileName: "综合素质测评办法.md"
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
      queryClient.invalidateQueries({ queryKey: ["logs", "recent"] })
    ]);
  }
});

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
      queryClient.invalidateQueries({ queryKey: ["logs", "recent"] })
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
    await queryClient.invalidateQueries({ queryKey: ["logs", "recent"] });
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
      queryClient.invalidateQueries({ queryKey: ["logs", "recent"] })
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
      queryClient.invalidateQueries({ queryKey: ["logs", "recent"] })
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
      queryClient.invalidateQueries({ queryKey: ["logs", "recent"] })
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

const policyErrorMessage = computed(() =>
  normalizeError(policyMutation.error.value, "政策请求失败。")
);

const noticeErrorMessage = computed(() =>
  normalizeError(noticeMutation.error.value, "通知请求失败。")
);

const roleLabels: Record<string, string> = {
  admin: "管理员",
  teacher: "教师",
  leader: "领导",
  student: "学生"
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
  "policies.create": "新增政策",
  "policies.upload": "上传政策附件",
  "policies.update": "编辑政策",
  "policies.activate": "启用政策",
  "policies.deactivate": "停用政策",
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
    sourceFileName: policy.sourceFileName
  };
}

function copyPolicyAsNewVersion(policy: PolicyDoc) {
  editingPolicyId.value = null;
  policyFile.value = null;
  policyForm.value = {
    title: policy.title,
    category: policy.category,
    version: `${policy.version}.new`,
    sourceFileName: policy.sourceFileName
  };
}

function resetPolicyForm() {
  editingPolicyId.value = null;
  policyFile.value = null;
  policyForm.value = getDefaultPolicyForm();
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

    <section class="import-panel">
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
    </section>

    <section class="dual-panel">
      <section class="import-panel">
        <div class="panel-heading">
          <div>
            <strong>政策知识库</strong>
            <span>录入或上传政策文件，用于检索、问答提示和学生端来源溯源。</span>
          </div>
          <button type="button" class="primary-button" :disabled="policyMutation.isPending.value" @click="policyMutation.mutate()">
            {{ policyMutation.isPending.value ? "保存中..." : editingPolicyId ? "保存政策" : policyFile ? "上传政策附件" : "新增政策" }}
          </button>
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
        <p class="status-line">
          可上传 PDF、Word、Excel、图片或纯文本政策附件，单文件不超过 30MB；不选择附件时按原方式新增政策记录。
        </p>

        <p v-if="policyMutation.data.value" class="status-line success">
          已保存《{{ policyMutation.data.value.title }}》({{ policyMutation.data.value.version }})，来源：{{ policyMutation.data.value.sourceFileName }}。
        </p>
        <p v-if="policyErrorMessage" class="status-line error">
          {{ policyErrorMessage }}
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

      <section class="import-panel">
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

    <div class="module-grid">
      <article v-for="item in modules" :key="item" class="module-card">
        <strong>{{ item }}</strong>
        <span>已接入基础数据能力，筛选、分页和批量操作按验收优先级继续收敛。</span>
      </article>
    </div>

    <section class="module-list">
      <article v-for="log in logsQuery.data.value ?? []" :key="log.id" class="module-card">
        <strong>{{ logActionLabels[log.action] ?? log.action }}</strong>
        <span>{{ log.operator?.displayName ?? "系统" }} | {{ log.createdAt }}</span>
        <span>{{ formatLogDetail(log.detail) }}</span>
      </article>
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
.field textarea {
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

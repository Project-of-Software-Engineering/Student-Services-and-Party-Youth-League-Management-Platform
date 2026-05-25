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
  queryFn: async () => (await http.get("/policies")).data,
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

const policyForm = ref({
  title: "综合素质测评办法",
  category: "日常管理",
  version: "2026.1",
  sourceFileName: "综合素质测评办法.md"
});

const noticeForm = ref({
  title: "本周学生工作提醒",
  content: "请在周四晚前完成本周周报填报，并及时查看最新政策更新。",
  targetTags: "团员, 科研"
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

const policyMutation = useMutation({
  mutationFn: async () =>
    (
      await http.post("/policies", {
        ...policyForm.value
      })
    ).data,
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
        targetTags: noticeForm.value.targetTags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
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
  "policies.create": "新增政策",
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
            <span>录入政策文档，用于检索、问答提示和学生端查询。</span>
          </div>
          <button type="button" class="primary-button" :disabled="policyMutation.isPending.value" @click="policyMutation.mutate()">
            {{ policyMutation.isPending.value ? "保存中..." : "新增政策" }}
          </button>
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

        <p v-if="policyMutation.data.value" class="status-line success">
          已保存《{{ policyMutation.data.value.title }}》({{ policyMutation.data.value.version }})。
        </p>
        <p v-if="policyErrorMessage" class="status-line error">
          {{ policyErrorMessage }}
        </p>

        <article v-for="policy in policiesQuery.data.value ?? []" :key="policy.id" class="module-card compact-card">
          <strong>{{ policy.title }}</strong>
          <span>{{ policy.category }} | {{ policy.version }}</span>
          <span>{{ policy.sourceFileName }}</span>
        </article>
      </section>

      <section class="import-panel">
        <div class="panel-heading">
          <div>
            <strong>通知发布</strong>
            <span>按学生标签发布站内提醒；标签留空时默认面向全部学生。</span>
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
          <span>{{ channelLabels[notice.channel] ?? notice.channel }} | 接收人数 {{ notice.recipientCount }}</span>
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

.compact-card {
  padding: 16px;
  border: 1px solid var(--ruc-line);
  box-shadow: none;
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

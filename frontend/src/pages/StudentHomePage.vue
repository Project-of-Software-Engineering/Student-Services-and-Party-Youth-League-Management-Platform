<script setup lang="ts">
import { computed, ref } from "vue";
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

const modules = [
  "政策知识库",
  "党团流程跟踪",
  "通知与提醒",
  "学生画像与荣誉"
];

const meQuery = useQuery({
  queryKey: ["auth", "me"],
  queryFn: async () => (await http.get("/auth/me")).data,
  enabled: session.isAuthed
});

const myStudentQuery = useQuery({
  queryKey: ["students", "me"],
  queryFn: async () => (await http.get("/students/me")).data,
  enabled: session.isAuthed
});

const myStudentId = computed(() => myStudentQuery.data.value?.id ?? "");

const profileQuery = useQuery({
  queryKey: ["students", "me", "profile"],
  queryFn: async () => (await http.get("/students/me/profile")).data,
  enabled: computed(() => session.isAuthed && Boolean(myStudentId.value))
});

const processQuery = useQuery({
  queryKey: ["processes", "my"],
  queryFn: async () => (await http.get("/processes/my")).data,
  enabled: session.isAuthed
});

const noticesQuery = useQuery({
  queryKey: ["notices", "my"],
  queryFn: async () => (await http.get("/notices/my")).data,
  enabled: session.isAuthed
});

const policyKeyword = ref("党团");

const policiesQuery = useQuery({
  queryKey: computed(() => ["policies", policyKeyword.value]),
  queryFn: async () => (await http.get("/policies", { params: { keyword: policyKeyword.value } })).data,
  enabled: session.isAuthed
});

const policyAnswerQuery = useQuery({
  queryKey: computed(() => ["policies", "ask", policyKeyword.value]),
  queryFn: async () => (await http.get("/policies/ask", { params: { q: policyKeyword.value } })).data,
  enabled: computed(() => session.isAuthed && Boolean(policyKeyword.value.trim()))
});

const stageCodeLabels: Record<string, string> = {
  application: "申请提交",
  "league-training": "团校培养",
  "party-applicant": "积极分子考察",
  "development-review": "发展对象审查",
  "final-approval": "最终审批"
};

const stageStatusLabels: Record<string, string> = {
  completed: "已完成",
  current: "进行中",
  pending: "待开始"
};

const noticeChannelLabels: Record<string, string> = {
  IN_APP: "站内通知",
  EMAIL: "邮件通知",
  WECHAT: "微信通知"
};

const reminderLevelLabels: Record<string, string> = {
  info: "提示",
  warning: "待处理",
  success: "已完成"
};

const approvalStatusLabels: Record<string, string> = {
  DRAFT: "草稿",
  SUBMITTED: "已提交",
  IN_REVIEW: "审核中",
  APPROVED: "已通过",
  REJECTED: "已驳回",
  RETURNED: "退回补充"
};

const approvalRoleLabels: Record<string, string> = {
  teacher: "辅导员初审",
  admin: "学院复核",
  leader: "领导终审"
};

const approvalForm = ref({
  type: "党团发展材料审批",
  reason: "本人已完成本阶段培养、实践和材料整理，申请进入线上审批流程。"
});

const approvalsQuery = useQuery({
  queryKey: ["approvals", "mine"],
  queryFn: async () => (await http.get("/approvals", { params: { mine: true, limit: 6 } })).data,
  enabled: session.isAuthed
});

const approvalMutation = useMutation({
  mutationFn: async () => {
    const created = (
      await http.post("/approvals", {
        type: approvalForm.value.type,
        reason: approvalForm.value.reason
      })
    ).data;

    return (
      await http.post(`/approvals/${created.id}/submit`, {
        comment: "学生端创建并提交审批。"
      })
    ).data;
  },
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["approvals", "mine"] }),
      queryClient.invalidateQueries({ queryKey: ["approvals", "summary"] })
    ]);
  }
});

const approvalErrorMessage = computed(() =>
  normalizeError(approvalMutation.error.value, "审批提交失败。")
);

function currentApprovalStep(approval: { currentStep: number; steps: Array<{ stepNo: number; roleCode: string }> }) {
  return approval.steps.find((step) => step.stepNo === approval.currentStep + 1)?.roleCode ?? "";
}

function normalizeError(error: unknown, fallback: string) {
  if (!error) {
    return "";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
</script>

<template>
  <AppShell title="学生工作台" subtitle="查看个人画像、流程进度、政策检索与通知提醒。" :links="links">
    <div class="summary-row">
      <article class="summary-card">
        <strong>当前用户</strong>
        <span>{{ meQuery.data.value?.displayName ?? "未加载" }}</span>
      </article>
      <article class="summary-card">
        <strong>当前阶段</strong>
        <span>{{ stageCodeLabels[processQuery.data.value?.currentStageCode ?? ""] ?? "未加载" }}</span>
      </article>
      <article class="summary-card">
        <strong>画像标签数</strong>
        <span>{{ profileQuery.data.value?.tags?.length ?? 0 }}</span>
      </article>
      <article class="summary-card">
        <strong>提醒数量</strong>
        <span>{{ processQuery.data.value?.reminders?.length ?? 0 }}</span>
      </article>
      <article class="summary-card">
        <strong>我的通知</strong>
        <span>{{ noticesQuery.data.value?.length ?? 0 }}</span>
      </article>
    </div>

    <section class="timeline-grid">
      <article v-for="stage in processQuery.data.value?.stages ?? []" :key="stage.code" class="timeline-card" :data-status="stage.status">
        <strong>{{ stage.title }}</strong>
        <span>{{ stage.description }}</span>
        <small>{{ stageStatusLabels[stage.status] ?? stage.status }}</small>
      </article>
    </section>

    <section class="summary-row">
      <article class="module-card">
        <strong>{{ myStudentQuery.data.value?.name ?? "学生档案" }}</strong>
        <span>
          {{ myStudentQuery.data.value?.studentNo ?? "未绑定学生信息" }}
          <template v-if="myStudentQuery.data.value">
            | {{ myStudentQuery.data.value.major }} | {{ myStudentQuery.data.value.className }}
          </template>
        </span>
        <span>{{ profileQuery.data.value?.bio ?? "暂未录入个人简介。" }}</span>
      </article>

      <article v-for="item in processQuery.data.value?.reminders ?? []" :key="item.title" class="module-card">
        <strong>{{ item.title }}</strong>
        <span>{{ item.description }}</span>
        <small>{{ reminderLevelLabels[item.level] ?? item.level }}</small>
      </article>
    </section>

    <section class="summary-row">
      <article class="module-card policy-panel">
        <strong>政策检索</strong>
        <input v-model="policyKeyword" type="text" placeholder="请输入政策关键词" />
        <span>{{ policyAnswerQuery.data.value?.answer ?? "请输入关键词获取政策指引。" }}</span>
      </article>

      <article v-for="policy in policiesQuery.data.value ?? []" :key="policy.id" class="module-card">
        <strong>{{ policy.title }}</strong>
        <span>{{ policy.category }} | {{ policy.version }}</span>
        <small>{{ policy.sourceFileName }}</small>
      </article>
    </section>

    <section class="approval-panel">
      <div class="panel-heading">
        <div>
          <strong>线上申请与审批</strong>
          <span>提交后进入辅导员、学院、领导三级审批流程。</span>
        </div>
        <button type="button" class="primary-button" :disabled="approvalMutation.isPending.value" @click="approvalMutation.mutate()">
          {{ approvalMutation.isPending.value ? "提交中..." : "创建并提交" }}
        </button>
      </div>

      <div class="approval-form">
        <label class="field">
          <span>申请类型</span>
          <input v-model="approvalForm.type" type="text" />
        </label>
        <label class="field">
          <span>申请理由</span>
          <textarea v-model="approvalForm.reason" rows="5" />
        </label>
      </div>

      <p v-if="approvalMutation.data.value" class="status-line success">
        《{{ approvalMutation.data.value.type }}》已提交，当前状态：{{ approvalStatusLabels[approvalMutation.data.value.status] ?? approvalMutation.data.value.status }}。
      </p>
      <p v-if="approvalErrorMessage" class="status-line error">{{ approvalErrorMessage }}</p>

      <div class="approval-list">
        <article v-for="approval in approvalsQuery.data.value ?? []" :key="approval.id" class="approval-card">
          <strong>{{ approval.type }}</strong>
          <span>{{ approval.reason }}</span>
          <small>
            {{ approvalStatusLabels[approval.status] ?? approval.status }}
            <template v-if="currentApprovalStep(approval)">
              | 当前：{{ approvalRoleLabels[currentApprovalStep(approval)] ?? currentApprovalStep(approval) }}
            </template>
          </small>
        </article>
      </div>
    </section>

    <div class="module-grid">
      <article v-for="item in modules" :key="item" class="module-card">
        <strong>{{ item }}</strong>
        <span>后续将继续补充对应页面与接口联动能力。</span>
      </article>
    </div>

    <section class="summary-row">
      <article v-for="notice in noticesQuery.data.value ?? []" :key="notice.id" class="module-card">
        <strong>{{ notice.title }}</strong>
        <span>{{ notice.content }}</span>
        <small>{{ noticeChannelLabels[notice.channel] ?? notice.channel }} | {{ notice.publishedAt ?? "草稿" }}</small>
      </article>
    </section>
  </AppShell>
</template>

<style scoped>
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}

.timeline-grid,
.summary-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
  margin-bottom: 26px;
}

.timeline-card,
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

.module-card small,
.timeline-card small {
  color: var(--ruc-red);
  text-transform: uppercase;
  font-weight: 700;
}

.policy-panel input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--ruc-line);
  background: #fffdf8;
  color: var(--ruc-ink);
  font: inherit;
}

.approval-panel {
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

.panel-heading strong {
  font-size: 22px;
}

.panel-heading span,
.field span,
.status-line {
  color: var(--ruc-muted);
}

.approval-form,
.approval-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
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
  resize: vertical;
}

.approval-card {
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--ruc-line);
  background: #fffdf8;
}

.approval-card span {
  color: var(--ruc-muted);
  line-height: 1.65;
}

.approval-card small {
  color: var(--ruc-red);
  font-weight: 700;
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

.primary-button:disabled {
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

.timeline-card[data-status="completed"] {
  border-color: rgba(29, 104, 65, 0.28);
  background: linear-gradient(135deg, rgba(29, 104, 65, 0.08), #fffaf2 60%);
}

.timeline-card[data-status="current"] {
  border-color: rgba(157, 0, 0, 0.35);
  background: linear-gradient(135deg, rgba(157, 0, 0, 0.12), #fffaf2 62%);
  border-top: 4px solid var(--ruc-red);
}

.timeline-card[data-status="pending"] {
  border-color: var(--ruc-line);
}

.summary-card {
  display: grid;
  gap: 6px;
  padding: 16px 20px;
  background: #fffaf2;
  border: 1px solid var(--ruc-line);
  border-top: 4px solid var(--ruc-red);
  box-shadow: var(--ruc-shadow);
}

.summary-card span {
  color: var(--ruc-red);
  font-size: 26px;
  font-weight: 800;
  font-family: Georgia, serif;
}

@media (max-width: 900px) {
  .panel-heading {
    flex-direction: column;
  }
}
</style>

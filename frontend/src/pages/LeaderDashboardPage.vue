<script setup lang="ts">
import { computed, ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import AppShell from "@/components/AppShell.vue";
import { http } from "@/services/http";
import { useSessionStore } from "@/stores/session";

type DecisionAction = "approve" | "reject" | "return";

interface ApprovalFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
}

interface ApprovalStep {
  id: string;
  stepNo: number;
  roleCode: string;
  decision: string;
  comment: string | null;
  decidedAt: string | null;
  operator: {
    displayName: string;
  } | null;
}

interface ApprovalItem {
  id: string;
  type: string;
  reason: string;
  status: string;
  currentStep: number;
  submittedAt: string | null;
  updatedAt: string;
  student: {
    name: string;
    studentNo: string;
    major: string;
    className: string;
  };
  steps: ApprovalStep[];
  attachments: ApprovalFile[];
}

const links = [
  { to: "/", label: "首页" },
  { to: "/student", label: "学生端" },
  { to: "/admin", label: "管理端" },
  { to: "/leader", label: "领导端" }
];

const session = useSessionStore();
session.hydrate();
const queryClient = useQueryClient();

const decisionComment = ref("同意按流程推进。");
const uploadApprovalId = ref("");
const uploadFile = ref<File | null>(null);
const uploadError = ref("");
const downloadError = ref("");

const summaryQuery = useQuery({
  queryKey: ["approvals", "summary"],
  queryFn: async () => (await http.get("/approvals/summary")).data,
  enabled: session.isAuthed
});

const approvalsQuery = useQuery({
  queryKey: ["approvals", "leader-list"],
  queryFn: async () => (await http.get("/approvals", { params: { limit: 12 } })).data as ApprovalItem[],
  enabled: session.isAuthed
});

const approvals = computed<ApprovalItem[]>(() => approvalsQuery.data.value ?? []);
const counts = computed(() => summaryQuery.data.value?.counts ?? {});
const firstApprovalId = computed(() => approvals.value[0]?.id ?? "");

const summaryCards = computed(() => [
  { title: "审批总数", value: counts.value.total ?? 0, desc: "平台当前可见审批单总量" },
  { title: "领导终审", value: counts.value.pendingFinal ?? 0, desc: "已流转至领导节点的事项" },
  { title: "已通过", value: counts.value.approved ?? 0, desc: "完成全部流程并归档" },
  { title: "退回补充", value: counts.value.returned ?? 0, desc: "需学生补充材料后再提交" },
  { title: "附件数", value: counts.value.attachments ?? 0, desc: "审批关联证明材料" }
]);

const decisionMutation = useMutation({
  mutationFn: async (payload: { id: string; action: DecisionAction }) =>
    (
      await http.post(`/approvals/${payload.id}/${payload.action}`, {
        comment: decisionComment.value
      })
    ).data,
  onSuccess: async () => {
    await refreshApprovals();
  }
});

const uploadMutation = useMutation({
  mutationFn: async () => {
    uploadError.value = "";
    const ownerId = uploadApprovalId.value || firstApprovalId.value;
    if (!ownerId) {
      throw new Error("请选择要关联的审批单。");
    }
    if (!uploadFile.value) {
      throw new Error("请选择要上传的附件。");
    }

    const formData = new FormData();
    formData.append("file", uploadFile.value);
    formData.append("ownerType", "approval");
    formData.append("ownerId", ownerId);

    return (await http.post("/files/upload", formData)).data;
  },
  onSuccess: async () => {
    uploadFile.value = null;
    await refreshApprovals();
  },
  onError: (error) => {
    uploadError.value = normalizeError(error, "附件上传失败。");
  }
});

const exportMutation = useMutation({
  mutationFn: async () => {
    const response = await http.get("/approvals/export", { responseType: "blob" });
    downloadBlob(response.data, "approvals.csv");
    return true;
  }
});

const statusLabels: Record<string, string> = {
  DRAFT: "草稿",
  SUBMITTED: "已提交",
  IN_REVIEW: "审核中",
  APPROVED: "已通过",
  REJECTED: "已驳回",
  RETURNED: "退回补充"
};

const decisionLabels: Record<string, string> = {
  PENDING: "待处理",
  APPROVED: "已通过",
  REJECTED: "已驳回",
  RETURNED: "已退回"
};

const roleLabels: Record<string, string> = {
  teacher: "辅导员初审",
  admin: "学院复核",
  leader: "领导终审"
};

const actionLabels: Record<DecisionAction, string> = {
  approve: "通过",
  reject: "驳回",
  return: "退回"
};
const decisionActions: DecisionAction[] = ["approve", "return", "reject"];

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  uploadFile.value = target.files?.[0] ?? null;
}

function getCurrentStep(approval: ApprovalItem) {
  return approval.steps.find((step) => step.stepNo === approval.currentStep + 1) ?? null;
}

function canDecide(approval: ApprovalItem) {
  const step = getCurrentStep(approval);
  if (!step || !["SUBMITTED", "IN_REVIEW"].includes(approval.status)) {
    return false;
  }

  const roles = session.user?.roles ?? [];
  return roles.includes("admin") || (roles as string[]).includes(step.roleCode);
}

function decide(id: string, action: DecisionAction) {
  decisionMutation.mutate({ id, action });
}

async function downloadAttachment(file: ApprovalFile) {
  downloadError.value = "";
  try {
    const response = await http.get(`/files/${file.id}/download`, { responseType: "blob" });
    downloadBlob(response.data, file.fileName);
  } catch (error) {
    downloadError.value = normalizeError(error, "附件下载失败。");
  }
}

function downloadBlob(blobPart: BlobPart, fileName: string) {
  const url = URL.createObjectURL(new Blob([blobPart]));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function refreshApprovals() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["approvals", "summary"] }),
    queryClient.invalidateQueries({ queryKey: ["approvals", "leader-list"] }),
    queryClient.invalidateQueries({ queryKey: ["logs", "recent"] })
  ]);
}

function formatDate(value: string | null) {
  if (!value) {
    return "未提交";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
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
  <AppShell title="领导驾驶舱" subtitle="查看平台运行概况、审批终审事项与附件归档情况。" :links="links">
    <section class="leader-hero">
      <div>
        <span>RUC OVERVIEW</span>
        <strong>以数据辅助学生工作研判，以流程支撑党团服务闭环。</strong>
      </div>
      <button type="button" class="ghost-button" :disabled="exportMutation.isPending.value" @click="exportMutation.mutate()">
        {{ exportMutation.isPending.value ? "导出中..." : "导出审批台账" }}
      </button>
    </section>

    <div class="summary-grid">
      <article v-for="item in summaryCards" :key="item.title" class="summary-card">
        <small>{{ item.value }}</small>
        <strong>{{ item.title }}</strong>
        <span>{{ item.desc }}</span>
      </article>
    </div>

    <section class="workbench-grid">
      <div class="approval-list">
        <div class="section-heading">
          <strong>审批队列</strong>
          <span>{{ summaryQuery.data.value?.generatedAt ? `更新时间 ${formatDate(summaryQuery.data.value.generatedAt)}` : "正在读取数据" }}</span>
        </div>

        <article v-for="approval in approvals" :key="approval.id" class="approval-card">
          <div class="approval-main">
            <div>
              <strong>{{ approval.type }}</strong>
              <span>{{ approval.student.name }} | {{ approval.student.studentNo }} | {{ approval.student.className }}</span>
            </div>
            <small :data-status="approval.status">{{ statusLabels[approval.status] ?? approval.status }}</small>
          </div>

          <p>{{ approval.reason }}</p>

          <div class="step-row">
            <span
              v-for="step in approval.steps"
              :key="step.id"
              class="step-chip"
              :data-decision="step.decision"
            >
              {{ roleLabels[step.roleCode] ?? step.roleCode }} · {{ decisionLabels[step.decision] ?? step.decision }}
            </span>
          </div>

          <div class="approval-meta">
            <span>当前节点：{{ roleLabels[getCurrentStep(approval)?.roleCode ?? ""] ?? "已结束" }}</span>
            <span>提交时间：{{ formatDate(approval.submittedAt) }}</span>
            <span>更新时间：{{ formatDate(approval.updatedAt) }}</span>
          </div>

          <div v-if="approval.attachments.length" class="attachment-row">
            <button
              v-for="file in approval.attachments"
              :key="file.id"
              type="button"
              class="file-button"
              @click="downloadAttachment(file)"
            >
              {{ file.fileName }} · {{ formatFileSize(file.fileSize) }}
            </button>
          </div>

          <div v-if="canDecide(approval)" class="decision-row">
            <button
              v-for="action in decisionActions"
              :key="action"
              type="button"
              class="primary-button"
              :data-action="action"
              :disabled="decisionMutation.isPending.value"
              @click="decide(approval.id, action)"
            >
              {{ actionLabels[action] }}
            </button>
          </div>
        </article>

        <p v-if="!approvals.length" class="empty-line">暂无审批数据。</p>
        <p v-if="downloadError" class="status-line error">{{ downloadError }}</p>
      </div>

      <aside class="side-panel">
        <section class="tool-panel">
          <div class="section-heading">
            <strong>处理意见</strong>
            <span>用于通过、退回或驳回当前审批节点。</span>
          </div>
          <textarea v-model="decisionComment" rows="5" />
          <p v-if="decisionMutation.data.value" class="status-line success">
            已更新《{{ decisionMutation.data.value.type }}》状态。
          </p>
          <p v-if="decisionMutation.error.value" class="status-line error">
            {{ normalizeError(decisionMutation.error.value, "审批处理失败。") }}
          </p>
        </section>

        <section class="tool-panel">
          <div class="section-heading">
            <strong>附件归档</strong>
            <span>上传后直接关联至选定审批单。</span>
          </div>
          <label class="field">
            <span>关联审批</span>
            <select v-model="uploadApprovalId">
              <option value="">最近一条审批</option>
              <option v-for="approval in approvals" :key="approval.id" :value="approval.id">
                {{ approval.type }} · {{ approval.student.name }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>附件文件</span>
            <input type="file" @change="handleFileChange" />
          </label>
          <button type="button" class="primary-button" :disabled="uploadMutation.isPending.value" @click="uploadMutation.mutate()">
            {{ uploadMutation.isPending.value ? "上传中..." : "上传附件" }}
          </button>
          <p v-if="uploadMutation.data.value" class="status-line success">
            已上传 {{ uploadMutation.data.value.fileName }}。
          </p>
          <p v-if="uploadError" class="status-line error">{{ uploadError }}</p>
        </section>

        <section class="tool-panel">
          <div class="section-heading">
            <strong>类型分布</strong>
            <span>近期审批事项构成。</span>
          </div>
          <div class="type-list">
            <span v-for="item in summaryQuery.data.value?.typeDistribution ?? []" :key="item.type">
              {{ item.type }} <strong>{{ item.count }}</strong>
            </span>
          </div>
        </section>
      </aside>
    </section>
  </AppShell>
</template>

<style scoped>
.leader-hero {
  min-height: 260px;
  margin-bottom: 26px;
  padding: 34px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;
  color: #fffaf2;
  background:
    linear-gradient(90deg, rgba(78, 0, 0, 0.82), rgba(78, 0, 0, 0.18)),
    linear-gradient(0deg, rgba(0, 0, 0, 0.46), transparent),
    url("/ruc-images/tongzhou.jpg") center / cover;
  box-shadow: var(--ruc-shadow);
}

.leader-hero span {
  color: var(--ruc-gold);
  font-family: "Times New Roman", serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.leader-hero strong {
  display: block;
  max-width: 720px;
  margin-top: 12px;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.3;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 18px;
  margin-bottom: 26px;
}

.summary-card,
.approval-card,
.tool-panel {
  display: grid;
  gap: 10px;
  padding: 20px;
  background: var(--ruc-card);
  border: 1px solid var(--ruc-line);
  box-shadow: var(--ruc-shadow);
}

.summary-card {
  border-top: 4px solid var(--ruc-red);
}

.summary-card small {
  color: var(--ruc-red);
  font-size: 30px;
  font-family: Georgia, serif;
  font-weight: 800;
}

.summary-card span,
.approval-card span,
.approval-card p,
.section-heading span,
.field span,
.status-line,
.empty-line {
  color: var(--ruc-muted);
  line-height: 1.65;
}

.workbench-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
}

.approval-list,
.side-panel {
  display: grid;
  align-content: start;
  gap: 18px;
}

.section-heading,
.approval-main,
.approval-meta,
.decision-row,
.attachment-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.section-heading strong {
  font-size: 22px;
}

.approval-main strong {
  display: block;
  margin-bottom: 4px;
  font-size: 20px;
}

.approval-card p {
  margin: 0;
}

.approval-main small {
  padding: 6px 10px;
  color: #ffffff;
  background: var(--ruc-muted);
  font-weight: 700;
}

.approval-main small[data-status="APPROVED"] {
  background: #1d6841;
}

.approval-main small[data-status="RETURNED"],
.approval-main small[data-status="REJECTED"] {
  background: #8d4d1d;
}

.approval-main small[data-status="SUBMITTED"],
.approval-main small[data-status="IN_REVIEW"] {
  background: var(--ruc-red);
}

.step-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.step-chip {
  padding: 8px 10px;
  border: 1px solid var(--ruc-line);
  background: #fffdf8;
  color: var(--ruc-muted);
  font-size: 13px;
}

.step-chip[data-decision="APPROVED"] {
  border-color: rgba(29, 104, 65, 0.28);
  color: #1d6841;
}

.step-chip[data-decision="RETURNED"],
.step-chip[data-decision="REJECTED"] {
  border-color: rgba(141, 77, 29, 0.35);
  color: #8d4d1d;
}

.field {
  display: grid;
  gap: 8px;
}

.field input,
.field select,
.tool-panel textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--ruc-line);
  background: #fffdf8;
  color: var(--ruc-ink);
  font: inherit;
}

.tool-panel textarea {
  resize: vertical;
}

.primary-button,
.ghost-button,
.file-button {
  border: none;
  padding: 12px 16px;
  background: var(--ruc-red);
  color: #ffffff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.ghost-button {
  flex: 0 0 auto;
  background: rgba(255, 250, 242, 0.16);
  border: 1px solid rgba(255, 250, 242, 0.56);
}

.primary-button[data-action="return"] {
  background: #8d4d1d;
}

.primary-button[data-action="reject"] {
  background: var(--ruc-red-deep);
}

.file-button {
  background: #fffdf8;
  color: var(--ruc-red);
  border: 1px solid var(--ruc-line);
  text-align: left;
}

.primary-button:disabled,
.ghost-button:disabled {
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

.type-list {
  display: grid;
  gap: 10px;
}

.type-list span {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--ruc-muted);
}

.type-list strong {
  color: var(--ruc-red);
}

@media (max-width: 1100px) {
  .workbench-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .leader-hero {
    min-height: 240px;
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

<script setup lang="ts">
import AppShell from "@/components/AppShell.vue";

const links = [
  { to: "/", label: "首页" },
  { to: "/student", label: "学生端" },
  { to: "/admin", label: "管理端" },
  { to: "/leader", label: "领导端" }
];

const modules = [
  "运行总览",
  "终审事项",
  "月度报表",
  "风险与异常摘要"
];
</script>

<template>
  <AppShell title="领导驾驶舱" subtitle="查看平台运行概况与终审入口。" :links="links">
    <div class="module-grid">
      <article v-for="item in modules" :key="item" class="module-card">
        <strong>{{ item }}</strong>
        <span>用于后续补充统计卡片、汇总报表和决策摘要。</span>
      </article>
    </div>
  </AppShell>
</template>

<style scoped>
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.module-card {
  display: grid;
  gap: 8px;
  padding: 20px;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(18, 35, 61, 0.08);
}

.module-card span {
  color: #5f6f86;
}
</style>

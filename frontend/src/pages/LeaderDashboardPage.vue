<script setup lang="ts">
import AppShell from "@/components/AppShell.vue";

const links = [
  { to: "/", label: "首页" },
  { to: "/student", label: "学生端" },
  { to: "/admin", label: "管理端" },
  { to: "/leader", label: "领导端" }
];

const modules = [
  { title: "运行总览", value: "98.6%", desc: "平台服务可用性与学生端访问状态。" },
  { title: "终审事项", value: "12", desc: "待领导关注的党团流程终审与异常节点。" },
  { title: "月度报表", value: "5", desc: "学生服务、政策检索、通知触达汇总。" },
  { title: "风险与异常摘要", value: "3", desc: "流程滞留、通知未读、画像缺失等提醒。" }
];
</script>

<template>
  <AppShell title="领导驾驶舱" subtitle="查看平台运行概况与终审入口。" :links="links">
    <section class="leader-hero">
      <div>
        <span>RUC OVERVIEW</span>
        <strong>以数据辅助学生工作研判，以流程支撑党团服务闭环。</strong>
      </div>
    </section>

    <div class="module-grid">
      <article v-for="item in modules" :key="item.title" class="module-card">
        <small>{{ item.value }}</small>
        <strong>{{ item.title }}</strong>
        <span>{{ item.desc }}</span>
      </article>
    </div>
  </AppShell>
</template>

<style scoped>
.leader-hero {
  min-height: 300px;
  margin-bottom: 26px;
  padding: 34px;
  display: grid;
  align-content: end;
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
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1.3;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}

.module-card {
  display: grid;
  gap: 8px;
  padding: 20px;
  background: var(--ruc-card);
  border: 1px solid var(--ruc-line);
  border-top: 4px solid var(--ruc-red);
  box-shadow: var(--ruc-shadow);
}

.module-card small {
  color: var(--ruc-red);
  font-size: 30px;
  font-family: Georgia, serif;
  font-weight: 800;
}

.module-card span {
  color: var(--ruc-muted);
  line-height: 1.65;
}
</style>

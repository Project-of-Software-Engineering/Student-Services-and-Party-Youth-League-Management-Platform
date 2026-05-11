<template>
  <main class="landing">
    <section class="landing-hero">
      <p class="eyebrow">系统入口</p>
      <h1>学生综合服务与党团管理平台</h1>
      <p class="summary">
        当前版本已经具备登录、学生画像、流程提醒、政策检索、通知发布和数据导入等演示能力。
      </p>
    </section>

    <section class="landing-grid">
      <RouterLink to="/login" class="landing-card">
        <strong>登录入口</strong>
        <span>统一身份登录与会话初始化。</span>
      </RouterLink>
      <RouterLink to="/student" class="landing-card">
        <strong>学生端</strong>
        <span>政策检索、流程进度、个人画像、通知提醒。</span>
      </RouterLink>
      <RouterLink to="/admin" class="landing-card">
        <strong>管理端</strong>
        <span>数据导入、通知发布、政策维护、操作日志。</span>
      </RouterLink>
      <RouterLink to="/leader" class="landing-card">
        <strong>领导端</strong>
        <span>运行概览、终审事项、报表摘要。</span>
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  padding: 48px 24px;
}

.landing-hero {
  max-width: 720px;
  margin: 0 auto 32px;
  text-align: center;
}

.eyebrow {
  margin: 0 0 12px;
  color: #2559b8;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.landing-hero h1 {
  margin: 0 0 12px;
  font-size: clamp(36px, 6vw, 56px);
}

.summary {
  margin: 0;
  color: #5f6f86;
  font-size: 18px;
}

.landing-grid {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.landing-card {
  display: grid;
  gap: 8px;
  padding: 24px;
  border-radius: 20px;
  background: #ffffff;
  color: inherit;
  text-decoration: none;
  box-shadow: 0 18px 40px rgba(18, 35, 61, 0.08);
}

.landing-card span {
  color: #5f6f86;
}
</style>

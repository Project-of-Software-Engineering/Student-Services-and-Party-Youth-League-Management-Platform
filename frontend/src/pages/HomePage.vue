<template>
  <main class="landing">
    <aside class="landing-nav">
      <div class="brand-seal">人大</div>
      <nav>
        <RouterLink to="/login">统一登录</RouterLink>
        <RouterLink to="/student">学生服务</RouterLink>
        <RouterLink to="/admin">党团管理</RouterLink>
        <RouterLink to="/leader">领导端</RouterLink>
      </nav>
      <div class="history-mark">
        <span>1937</span>
        <small>中国人民大学</small>
      </div>
    </aside>

    <section class="landing-hero" aria-label="平台首页">
      <div class="top-links">
        <a>微人大</a>
        <a>图书馆</a>
        <a>校历</a>
        <a>信息公开</a>
        <RouterLink to="/login">EN</RouterLink>
      </div>
      <div class="hero-copy">
        <span>RUC STUDENT SERVICES</span>
        <h1>学生综合服务与党团管理平台</h1>
        <p>
          面向学生画像、党团流程、政策检索、通知发布与管理决策的一体化服务入口。
        </p>
        <div class="hero-actions">
          <RouterLink to="/login" class="primary-link">进入系统</RouterLink>
        </div>
      </div>
      <div class="explore-tab">探索平台 EXPLORE</div>
    </section>

    <section class="landing-grid" aria-label="系统模块">
      <RouterLink to="/login" class="landing-card">
        <small>01 / LOGIN</small>
        <strong>统一登录</strong>
        <span>面向学生、教师、管理员与领导角色的统一入口。</span>
      </RouterLink>
      <RouterLink to="/student" class="landing-card">
        <small>02 / STUDENT</small>
        <strong>学生服务</strong>
        <span>政策检索、流程进度、个人画像、通知提醒。</span>
      </RouterLink>
      <RouterLink to="/admin" class="landing-card">
        <small>03 / ADMIN</small>
        <strong>党团管理</strong>
        <span>数据导入、通知发布、政策维护、操作日志。</span>
      </RouterLink>
      <RouterLink to="/leader" class="landing-card">
        <small>04 / APPROVAL</small>
        <strong>领导端</strong>
        <span>终审事项、审批流转、附件归档与报表摘要。</span>
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 244px 1fr;
  background: var(--ruc-paper);
}

.landing-hero {
  position: relative;
  min-height: 72vh;
  padding: 34px min(5vw, 72px) 72px;
  display: grid;
  align-content: end;
  overflow: hidden;
  color: #fffaf2;
  background:
    linear-gradient(90deg, rgba(46, 0, 0, 0.88) 0%, rgba(86, 0, 0, 0.54) 38%, rgba(0, 0, 0, 0.08) 100%),
    linear-gradient(0deg, rgba(0, 0, 0, 0.55), transparent 45%),
    url("/ruc-images/zhongguancun-hero.jpg") center / cover;
}

.landing-nav {
  min-height: 100vh;
  padding: 34px 30px;
  background: linear-gradient(180deg, var(--ruc-red), var(--ruc-red-deep));
  color: #fff7ec;
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.brand-seal {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 233, 190, 0.86);
  border-radius: 50%;
  color: #ffe8bd;
  font-size: 22px;
  font-weight: 900;
}

.landing-nav nav {
  display: grid;
  align-content: center;
  gap: 26px;
}

.landing-nav a {
  color: inherit;
  text-decoration: none;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.history-mark {
  display: grid;
  gap: 4px;
  color: rgba(255, 245, 224, 0.76);
}

.history-mark span {
  color: var(--ruc-gold);
  font-family: Georgia, serif;
  font-size: 32px;
}

.top-links {
  position: absolute;
  top: 28px;
  right: 38px;
  display: flex;
  gap: 22px;
  align-items: center;
  color: rgba(255, 255, 255, 0.88);
  font-size: 14px;
}

.top-links a {
  text-decoration: none;
}

.hero-copy {
  max-width: 760px;
}

.hero-copy span {
  display: block;
  margin-bottom: 16px;
  color: var(--ruc-gold);
  font-family: "Times New Roman", serif;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.hero-copy h1 {
  margin: 0 0 20px;
  max-width: 720px;
  font-size: clamp(42px, 7vw, 82px);
  line-height: 1.05;
  letter-spacing: 0;
  text-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

.hero-copy p {
  max-width: 650px;
  margin: 0;
  color: rgba(255, 248, 232, 0.88);
  font-size: 20px;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  gap: 14px;
  margin-top: 34px;
}

.primary-link {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  padding: 0 24px;
  text-decoration: none;
  font-weight: 700;
}

.primary-link {
  background: var(--ruc-red);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.explore-tab {
  position: absolute;
  right: 0;
  top: 42%;
  writing-mode: vertical-rl;
  padding: 24px 12px;
  background: rgba(5, 33, 82, 0.82);
  border-radius: 18px 0 0 18px;
  letter-spacing: 0.08em;
  font-size: 13px;
}

.landing-grid {
  grid-column: 1 / -1;
  padding: 36px min(5vw, 72px) 56px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}

.landing-card {
  display: grid;
  gap: 8px;
  padding: 26px;
  background: var(--ruc-card);
  color: inherit;
  text-decoration: none;
  border-top: 4px solid var(--ruc-red);
  box-shadow: var(--ruc-shadow);
}

.landing-card small {
  color: var(--ruc-red);
  font-family: "Times New Roman", serif;
  letter-spacing: 0.12em;
  font-weight: 700;
}

.landing-card strong {
  font-size: 22px;
}

.landing-card span {
  color: var(--ruc-muted);
  line-height: 1.7;
}

@media (max-width: 860px) {
  .landing {
    grid-template-columns: 1fr;
  }

  .landing-nav {
    min-height: auto;
    grid-template-rows: none;
    gap: 24px;
  }

  .landing-nav nav {
    align-content: start;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .top-links {
    display: none;
  }
}
</style>

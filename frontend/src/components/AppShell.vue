<script setup lang="ts">
defineProps<{
  title: string;
  subtitle: string;
  links: Array<{ to: string; label: string }>;
}>();
</script>

<template>
  <div class="shell">
    <aside class="shell-nav">
      <div class="shell-brand">
        <div class="brand-mark">人大</div>
        <strong>学生综合服务与党团管理平台</strong>
        <span>RUC STUDENT SERVICES</span>
      </div>
      <nav class="shell-links">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to">
          {{ link.label }}
        </RouterLink>
      </nav>
      <div class="nav-footer">
        <span>1937</span>
        <small>实事求是 · 服务学生成长</small>
      </div>
    </aside>

    <main class="shell-main">
      <header class="shell-header">
        <div>
          <span class="section-label">RUC SERVICE PLATFORM</span>
          <h1>{{ title }}</h1>
          <p>{{ subtitle }}</p>
        </div>
      </header>
      <section class="shell-content">
        <slot />
      </section>
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 272px 1fr;
  background:
    linear-gradient(90deg, rgba(72, 0, 0, 0.1), transparent 24%),
    var(--ruc-paper);
}

.shell-nav {
  position: sticky;
  top: 0;
  min-height: 100vh;
  padding: 28px 26px;
  background:
    linear-gradient(180deg, rgba(118, 0, 0, 0.98), rgba(78, 0, 0, 0.98)),
    var(--ruc-red-dark);
  color: #fff7ec;
  display: grid;
  grid-template-rows: auto 1fr auto;
  border-right: 1px solid rgba(255, 255, 255, 0.18);
}

.shell-brand {
  display: grid;
  gap: 10px;
  padding-bottom: 28px;
  margin-bottom: 26px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.brand-mark {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 238, 204, 0.75);
  border-radius: 50%;
  color: #ffe8bd;
  font-weight: 800;
}

.shell-brand span {
  color: rgba(255, 244, 220, 0.72);
  font-size: 12px;
  letter-spacing: 0.12em;
  font-family: "Times New Roman", serif;
}

.shell-brand strong {
  line-height: 1.45;
  font-size: 18px;
}

.shell-links {
  display: grid;
  align-content: start;
  gap: 6px;
}

.shell-links a {
  color: inherit;
  text-decoration: none;
  padding: 14px 16px;
  border-left: 3px solid transparent;
  background: transparent;
  letter-spacing: 0.04em;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.shell-links a:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(2px);
}

.shell-links a.router-link-active {
  background: rgba(255, 255, 255, 0.13);
  border-left-color: var(--ruc-gold);
}

.nav-footer {
  display: grid;
  gap: 8px;
  color: rgba(255, 246, 224, 0.78);
}

.nav-footer span {
  color: var(--ruc-gold);
  font-size: 28px;
  font-family: Georgia, serif;
}

.nav-footer small {
  line-height: 1.6;
}

.shell-main {
  padding: 34px min(4vw, 56px) 56px;
}

.shell-header {
  margin-bottom: 28px;
  padding: 28px 0;
  border-bottom: 1px solid var(--ruc-line);
}

.shell-header h1 {
  margin: 0 0 8px;
  font-size: clamp(30px, 4vw, 44px);
  letter-spacing: 0;
}

.shell-header p {
  margin: 0;
  color: var(--ruc-muted);
  font-size: 16px;
}

.section-label {
  display: block;
  margin-bottom: 8px;
  color: var(--ruc-red);
  font-size: 12px;
  letter-spacing: 0.16em;
  font-family: "Times New Roman", serif;
  font-weight: 700;
}

@media (max-width: 900px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .shell-nav {
    position: static;
    min-height: auto;
  }
}
</style>

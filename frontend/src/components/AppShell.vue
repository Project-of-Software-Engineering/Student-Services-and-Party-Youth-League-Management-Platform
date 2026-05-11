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
        <strong>学生事务平台</strong>
        <span>演示系统</span>
      </div>
      <nav class="shell-links">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to">
          {{ link.label }}
        </RouterLink>
      </nav>
    </aside>

    <main class="shell-main">
      <header class="shell-header">
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
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
  grid-template-columns: 240px 1fr;
}

.shell-nav {
  padding: 24px;
  background: #12233d;
  color: #f5f7fb;
}

.shell-brand {
  display: grid;
  gap: 4px;
  margin-bottom: 24px;
}

.shell-brand span {
  color: #9eb2cc;
  font-size: 14px;
}

.shell-links {
  display: grid;
  gap: 10px;
}

.shell-links a {
  color: inherit;
  text-decoration: none;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
}

.shell-links a.router-link-active {
  background: rgba(255, 255, 255, 0.16);
}

.shell-main {
  padding: 32px;
}

.shell-header {
  margin-bottom: 24px;
}

.shell-header h1 {
  margin: 0 0 8px;
  font-size: 32px;
}

.shell-header p {
  margin: 0;
  color: #5f6f86;
}

@media (max-width: 900px) {
  .shell {
    grid-template-columns: 1fr;
  }
}
</style>

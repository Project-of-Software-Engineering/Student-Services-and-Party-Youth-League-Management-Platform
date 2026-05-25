<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useSessionStore } from "@/stores/session";
import type { RoleName } from "@/types/common";

const props = defineProps<{
  title: string;
  subtitle: string;
  links: Array<{ to: string; label: string }>;
}>();

const router = useRouter();
const session = useSessionStore();
session.hydrate();

const collapsed = ref(readCollapsedState());
const currentUser = computed(() => session.user);
const visibleLinks = computed(() => props.links.filter((link) => canSeeLink(link.to)));

function readCollapsedState() {
  if (typeof window === "undefined") {
    return true;
  }
  return window.localStorage.getItem("shell-nav-collapsed") !== "false";
}

function setCollapsed(value: boolean) {
  collapsed.value = value;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("shell-nav-collapsed", String(value));
  }
}

async function handleLogout() {
  session.clear();
  await router.push("/login");
}

function canSeeLink(to: string) {
  const roles = currentUser.value?.roles ?? [];
  if (to === "/admin") {
    return hasAnyRole(roles, ["teacher", "admin"]);
  }
  if (to === "/leader") {
    return hasAnyRole(roles, ["leader", "admin"]);
  }
  return true;
}

function hasAnyRole(userRoles: RoleName[], allowedRoles: RoleName[]) {
  return userRoles.some((role) => allowedRoles.includes(role));
}
</script>

<template>
  <div class="shell" :class="{ 'nav-collapsed': collapsed }">
    <aside
      class="shell-nav"
      @mouseenter="setCollapsed(false)"
      @mouseleave="setCollapsed(true)"
    >
      <div class="shell-brand">
        <span class="brand-mark" role="img" aria-label="校徽"></span>
        <strong class="brand-title">学生综合服务与党团管理平台</strong>
        <span class="brand-sub">RUC STUDENT SERVICES</span>
      </div>
      <div class="collapsed-label">导航</div>
      <nav class="shell-links">
        <RouterLink v-for="link in visibleLinks" :key="link.to" :to="link.to">
          {{ link.label }}
        </RouterLink>
      </nav>
      <div class="nav-footer">
        <div class="history-mark">
          <span>1937</span>
          <small>实事求是 · 服务学生成长</small>
        </div>
        <div v-if="currentUser" class="session-card">
          <strong>{{ currentUser.displayName }}</strong>
          <small>{{ currentUser.username }}</small>
          <button type="button" @click="handleLogout">退出登录</button>
        </div>
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
  --nav-width: 272px;
  --nav-collapsed-width: 64px;
  background:
    linear-gradient(90deg, rgba(72, 0, 0, 0.1), transparent 24%),
    var(--ruc-paper);
}

.shell.nav-collapsed {
  --nav-width: var(--nav-collapsed-width);
}

.shell-nav {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 20;
  width: var(--nav-width);
  height: 100vh;
  padding: 30px 20px 20px;
  background:
    linear-gradient(180deg, rgba(118, 0, 0, 0.98), rgba(78, 0, 0, 0.98)),
    var(--ruc-red-dark);
  color: #fff7ec;
  display: grid;
  grid-template-rows: auto 1fr auto;
  border-right: 1px solid rgba(255, 255, 255, 0.18);
  overflow: hidden;
  transition:
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-collapsed .shell-nav {
  padding: 24px 8px 18px;
}

.shell-brand {
  display: grid;
  justify-items: start;
  gap: 8px;
  padding-bottom: 22px;
  margin-bottom: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  text-align: left;
}

.brand-mark {
  width: 72px;
  height: 72px;
  background: var(--ruc-gold);
  border-radius: 50%;
  -webkit-mask: url("/ruc-images/logo.png") center / contain no-repeat;
  mask: url("/ruc-images/logo.png") center / contain no-repeat;
  transition:
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    margin 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-collapsed .shell-brand {
  display: flex;
  justify-content: flex-start;
  padding-bottom: 0;
  padding-left: 3px;
  margin-bottom: 0;
  border-bottom-color: transparent;
  width: 100%;
}

.nav-collapsed .brand-mark {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  margin: 0;
}

.brand-title,
.brand-sub {
  white-space: nowrap;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.brand-title {
  line-height: 1.45;
  font-size: 18px;
  text-align: left;
}

.brand-sub {
  color: rgba(255, 244, 220, 0.72);
  font-size: 12px;
  letter-spacing: 0.12em;
  font-family: "Times New Roman", serif;
}

.nav-collapsed .brand-title,
.nav-collapsed .brand-sub {
  opacity: 0;
  pointer-events: none;
  position: absolute;
}

.collapsed-label {
  position: absolute;
  top: 50%;
  left: 50%;
  writing-mode: vertical-rl;
  transform: translate(-50%, -50%);
  letter-spacing: 0.36em;
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 238, 204, 0.85);
  opacity: 1;
  transition: opacity 0.2s ease;
}

.shell:not(.nav-collapsed) .collapsed-label {
  opacity: 0;
  pointer-events: none;
  position: absolute;
}

.shell-links {
  display: grid;
  align-content: center;
  justify-items: stretch;
  gap: 12px;
  opacity: 1;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-collapsed .shell-links {
  opacity: 0;
  pointer-events: none;
}

.shell-links a {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  min-height: 46px;
  color: inherit;
  text-decoration: none;
  padding: 12px 18px;
  border-left: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-align: left;
  white-space: nowrap;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.shell-links a:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.shell-links a.router-link-active {
  background: rgba(255, 255, 255, 0.13);
  border-bottom-color: var(--ruc-gold);
}

.nav-footer {
  display: grid;
  gap: 12px;
  color: rgba(255, 246, 224, 0.78);
  opacity: 1;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-collapsed .nav-footer {
  opacity: 0;
  pointer-events: none;
}

.history-mark {
  display: grid;
  gap: 2px;
  justify-items: start;
  text-align: left;
}

.history-mark span {
  color: var(--ruc-gold);
  font-size: 30px;
  line-height: 1;
  font-family: Georgia, serif;
}

.history-mark small {
  line-height: 1.45;
  font-size: 12px;
}

.session-card {
  display: grid;
  justify-items: start;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  text-align: left;
}

.session-card strong {
  color: #fff7ec;
  font-size: 15px;
}

.session-card small {
  font-size: 12px;
  line-height: 1.2;
}

.session-card button {
  min-height: 34px;
  margin-top: 8px;
  padding: 0 18px;
  border: 1px solid rgba(255, 238, 204, 0.48);
  background: rgba(255, 255, 255, 0.1);
  color: #fff7ec;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.session-card button:hover {
  background: rgba(255, 255, 255, 0.16);
}

.shell-main {
  margin-left: var(--nav-width);
  padding: 34px min(4vw, 56px) 56px;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
    --nav-width: 100%;
  }

  .shell-nav {
    position: static;
    width: 100%;
    height: auto;
    min-height: auto;
  }

  .shell-main {
    margin-left: 0;
  }
}
</style>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "@/components/AppShell.vue";
import { http } from "@/services/http";
import { useSessionStore } from "@/stores/session";

const links = [
  { to: "/", label: "首页" },
  { to: "/student", label: "学生端" },
  { to: "/admin", label: "管理端" },
  { to: "/leader", label: "领导端" }
];

const router = useRouter();
const session = useSessionStore();
session.hydrate();

const username = ref("demo.admin");
const password = ref("demo1234");
const errorMessage = ref("");
const loading = ref(false);

async function handleLogin() {
  errorMessage.value = "";
  loading.value = true;

  try {
    const { data } = await http.post("/auth/login", {
      username: username.value,
      password: password.value
    });

    session.setSession(data.accessToken, data.user);
    await router.push(data.user.roles.includes("student") ? "/student" : "/admin");
  } catch (error) {
    errorMessage.value = "登录失败，请检查账号和密码。";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AppShell title="登录" subtitle="进入学生综合服务与党团管理平台。" :links="links">
    <section class="login-layout">
      <div class="login-visual">
        <span>RENMIN UNIVERSITY OF CHINA</span>
        <strong>以学生成长为中心，连接服务、管理与党团事务。</strong>
      </div>

      <form class="form-card" @submit.prevent="handleLogin">
        <div class="form-heading">
          <span>UNIFIED LOGIN</span>
          <strong>统一身份登录</strong>
        </div>
        <label>
          <span>账号</span>
          <input v-model="username" type="text" placeholder="demo.admin" />
        </label>
        <label>
          <span>密码</span>
          <input v-model="password" type="password" placeholder="请输入密码" />
        </label>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <button type="submit" :disabled="loading">
          {{ loading ? "登录中..." : "立即登录" }}
        </button>
      </form>
    </section>
  </AppShell>
</template>

<style scoped>
.login-layout {
  display: grid;
  grid-template-columns: minmax(280px, 1.2fr) minmax(320px, 0.8fr);
  gap: 24px;
  align-items: stretch;
}

.login-visual {
  min-height: 520px;
  padding: 36px;
  display: grid;
  align-content: end;
  color: #fff7ec;
  background:
    linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.68) 100%),
    linear-gradient(90deg, rgba(100, 0, 0, 0.65), transparent 58%),
    url("/ruc-images/old-campus.jpg") center / cover;
  box-shadow: var(--ruc-shadow);
}

.login-visual span,
.form-heading span {
  color: var(--ruc-gold);
  font-family: "Times New Roman", serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.login-visual strong {
  max-width: 560px;
  margin-top: 14px;
  font-size: clamp(28px, 4vw, 46px);
  line-height: 1.25;
}

.form-card {
  display: grid;
  gap: 16px;
  align-content: center;
  padding: 34px;
  background: var(--ruc-card);
  border: 1px solid var(--ruc-line);
  border-top: 5px solid var(--ruc-red);
  box-shadow: var(--ruc-shadow);
}

.form-heading {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.form-heading strong {
  font-size: 30px;
}

label {
  display: grid;
  gap: 8px;
}

input {
  padding: 12px 14px;
  border: 1px solid var(--ruc-line);
  background: #fffdf8;
}

button {
  min-height: 46px;
  padding: 12px 16px;
  border: 0;
  background: var(--ruc-red);
  color: #ffffff;
  cursor: pointer;
  font-weight: 700;
}

button:disabled {
  opacity: 0.7;
  cursor: progress;
}

.error {
  margin: 0;
  color: var(--ruc-red);
}

@media (max-width: 960px) {
  .login-layout {
    grid-template-columns: 1fr;
  }

  .login-visual {
    min-height: 340px;
  }
}
</style>

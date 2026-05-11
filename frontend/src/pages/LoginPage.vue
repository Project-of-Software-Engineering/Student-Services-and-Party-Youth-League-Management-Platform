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
    <form class="form-card" @submit.prevent="handleLogin">
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
  </AppShell>
</template>

<style scoped>
.form-card {
  max-width: 420px;
  display: grid;
  gap: 16px;
  padding: 24px;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(18, 35, 61, 0.08);
}

label {
  display: grid;
  gap: 8px;
}

input {
  padding: 12px 14px;
  border: 1px solid #d8e0eb;
  border-radius: 12px;
}

button {
  padding: 12px 16px;
  border: 0;
  border-radius: 12px;
  background: #2559b8;
  color: #ffffff;
  cursor: pointer;
}

button:disabled {
  opacity: 0.7;
  cursor: progress;
}

.error {
  margin: 0;
  color: #b42318;
}
</style>

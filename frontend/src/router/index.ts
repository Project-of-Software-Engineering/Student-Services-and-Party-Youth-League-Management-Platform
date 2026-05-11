import { createRouter, createWebHistory } from "vue-router";
import { useSessionStore } from "@/stores/session";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/pages/HomePage.vue")
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/pages/LoginPage.vue")
    },
    {
      path: "/student",
      name: "student",
      component: () => import("@/pages/StudentHomePage.vue")
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("@/pages/AdminDashboardPage.vue")
    },
    {
      path: "/leader",
      name: "leader",
      component: () => import("@/pages/LeaderDashboardPage.vue")
    }
  ]
});

router.beforeEach((to) => {
  const session = useSessionStore();
  session.hydrate();
  if (to.path !== "/" && to.path !== "/login" && !session.isAuthed) {
    return "/login";
  }
  if (to.path === "/login" && session.isAuthed) {
    return "/student";
  }
});

export default router;

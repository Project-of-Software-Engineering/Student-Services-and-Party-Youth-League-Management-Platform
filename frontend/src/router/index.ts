import { createRouter, createWebHistory } from "vue-router";
import { useSessionStore } from "@/stores/session";
import type { RoleName } from "@/types/common";

const defaultRouteByRole: Record<RoleName, string> = {
  student: "/student",
  teacher: "/admin",
  admin: "/admin",
  leader: "/leader",
  league_secretary: "/admin/organizations"
};

function getDefaultRoute(roles: RoleName[] = []) {
  if (roles.includes("student")) {
    return defaultRouteByRole.student;
  }
  if (roles.includes("leader")) {
    return defaultRouteByRole.leader;
  }
  if (roles.includes("teacher")) {
    return defaultRouteByRole.teacher;
  }
  if (roles.includes("league_secretary")) {
    return defaultRouteByRole.league_secretary;
  }
  if (roles.includes("admin")) {
    return defaultRouteByRole.admin;
  }
  return "/";
}

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
      component: () => import("@/pages/StudentHomePage.vue"),
      meta: {
        roles: ["student", "teacher", "admin", "leader"]
      }
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("@/pages/AdminDashboardPage.vue"),
      meta: {
        roles: ["teacher", "admin"]
      }
    },
    {
      path: "/admin/students",
      name: "admin-students",
      component: () => import("@/pages/AdminDashboardPage.vue"),
      meta: {
        roles: ["teacher", "admin"]
      }
    },
    {
      path: "/admin/policies",
      name: "admin-policies",
      component: () => import("@/pages/AdminDashboardPage.vue"),
      meta: {
        roles: ["teacher", "admin"]
      }
    },
    {
      path: "/admin/notices",
      name: "admin-notices",
      component: () => import("@/pages/AdminDashboardPage.vue"),
      meta: {
        roles: ["teacher", "admin"]
      }
    },
    {
      path: "/admin/certificates",
      name: "admin-certificates",
      component: () => import("@/pages/AdminDashboardPage.vue"),
      meta: {
        roles: ["teacher", "admin"]
      }
    },
    {
      path: "/admin/logs",
      name: "admin-logs",
      component: () => import("@/pages/AdminDashboardPage.vue"),
      meta: {
        roles: ["teacher", "admin"]
      }
    },
    {
      path: "/admin/organizations",
      name: "admin-organizations",
      component: () => import("@/pages/AdminDashboardPage.vue"),
      meta: {
        roles: ["teacher", "admin", "league_secretary"]
      }
    },
    {
      path: "/admin/templates",
      name: "admin-templates",
      component: () => import("@/pages/AdminDashboardPage.vue"),
      meta: {
        roles: ["teacher", "admin"]
      }
    },
    {
      path: "/leader",
      name: "leader",
      component: () => import("@/pages/LeaderDashboardPage.vue"),
      meta: {
        roles: ["leader", "admin"]
      }
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
    return getDefaultRoute(session.user?.roles);
  }

  const allowedRoles = to.meta.roles as RoleName[] | undefined;
  if (allowedRoles?.length && !session.user?.roles.some((role) => allowedRoles.includes(role))) {
    return getDefaultRoute(session.user?.roles);
  }
});

export default router;

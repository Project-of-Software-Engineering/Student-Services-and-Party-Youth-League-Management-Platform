import { defineStore } from "pinia";
import type { RoleName } from "@/types/common";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  roles: RoleName[];
}

interface SessionState {
  token: string;
  user: SessionUser | null;
}

export const useSessionStore = defineStore("session", {
  state: (): SessionState => ({
    token: "",
    user: null
  }),
  getters: {
    isAuthed: (state): boolean => Boolean(state.token)
  },
  actions: {
    hydrate() {
      const raw = localStorage.getItem("session");
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw) as SessionState;
        this.token = parsed.token ?? "";
        this.user = parsed.user ?? null;
      } catch {
        this.clear();
      }
    },
    setSession(token: string, user: SessionUser) {
      this.token = token;
      this.user = user;
      localStorage.setItem("session", JSON.stringify({ token, user }));
    },
    clear() {
      this.token = "";
      this.user = null;
      localStorage.removeItem("session");
    }
  }
});

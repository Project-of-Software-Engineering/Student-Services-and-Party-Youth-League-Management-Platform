import axios from "axios";
import { useSessionStore } from "@/stores/session";

export const http = axios.create({
  baseURL: "/api",
  withCredentials: true
});

http.interceptors.request.use((config) => {
  const store = useSessionStore();
  if (store.token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${store.token}`;
  }
  return config;
});

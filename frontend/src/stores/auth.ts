import { computed, ref } from "vue";
import { defineStore } from "pinia";
import * as authApi from "@/api/auth";
import { ApiError } from "@/api/http";

const TOKEN_KEY = "soniclight.token";

// The only store of the project: it owns the session, token included.
export const useAuthStore = defineStore("auth", () => {
  const token = ref(localStorage.getItem(TOKEN_KEY));
  const user = ref<authApi.User | null>(null);

  // UI comfort only: the real admin check is requireAdmin on the server.
  const isAdmin = computed(() => user.value?.role === "ADMIN");

  function startSession(result: authApi.AuthResult): void {
    token.value = result.token;
    localStorage.setItem(TOKEN_KEY, result.token);
    user.value = result.user;
  }

  async function login(credentials: authApi.Credentials): Promise<void> {
    startSession(await authApi.login(credentials));
  }

  async function register(credentials: authApi.Credentials): Promise<void> {
    startSession(await authApi.register(credentials));
  }

  // No server call: a stateless token cannot be revoked.
  function logout(): void {
    token.value = null;
    localStorage.removeItem(TOKEN_KEY);
    user.value = null;
  }

  /** On startup: the role comes from the server, never from the decoded token. */
  async function restore(): Promise<void> {
    if (!token.value) return;
    try {
      user.value = await authApi.getMe();
    } catch (err) {
      // Only the server can invalidate a token (http.ts logs out on a 401). A network
      // failure must not: the app starts signed out, and the token is tried again later.
      if (!(err instanceof ApiError) || err.status !== 401) user.value = null;
    }
  }

  return { token, user, isAdmin, login, register, logout, restore };
});

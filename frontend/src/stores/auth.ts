import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/api/auth'
import { clearToken, hasToken, setToken } from '@/api/http'

// The only store of the project: the one state shared by unrelated routes.
export const useAuthStore = defineStore('auth', () => {
  const user = ref<authApi.User | null>(null)

  // UI comfort only: the real admin check is requireAdmin on the server.
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function login(credentials: authApi.Credentials): Promise<void> {
    const result = await authApi.login(credentials)
    setToken(result.token)
    user.value = result.user
  }

  async function register(credentials: authApi.Credentials): Promise<void> {
    const result = await authApi.register(credentials)
    setToken(result.token)
    user.value = result.user
  }

  // No server call: a stateless token cannot be revoked, forgetting it is the logout.
  function logout(): void {
    clearToken()
    user.value = null
  }

  /** On startup: if a token is stored, ask the server who it belongs to. */
  async function restore(): Promise<void> {
    if (!hasToken()) return
    try {
      user.value = await authApi.getMe()
    } catch {
      // Expired token (http.ts already logged out and redirected), or API down: start signed out.
      logout()
    }
  }

  return { user, isAdmin, login, register, logout, restore }
})

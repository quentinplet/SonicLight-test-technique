import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminView from '@/views/AdminView.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Signed-in users only. */
    requiresAuth?: boolean
    /** Signed-in admins only. */
    requiresAdmin?: boolean
    /** Signed-out visitors only (login, register). */
    guestOnly?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },
    { path: '/admin', name: 'admin', component: AdminView, meta: { requiresAdmin: true } },
  ],
})

// UI comfort, not security: the server enforces every rule again (requireAuth, requireAdmin).
// The store is already restored when the first navigation runs (see main.ts).
router.beforeEach((to) => {
  const auth = useAuthStore()
  const signedIn = auth.user !== null

  if ((to.meta.requiresAuth || to.meta.requiresAdmin) && !signedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) return { name: 'home' }
  if (to.meta.guestOnly && signedIn) return { name: 'home' }
})

export default router

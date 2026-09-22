import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import AdminView from "@/views/AdminView.vue";
import DrawView from "@/views/DrawView.vue";
import LoginView from "@/views/LoginView.vue";
import NotFoundView from "@/views/NotFoundView.vue";
import RegisterView from "@/views/RegisterView.vue";

declare module "vue-router" {
  interface RouteMeta {
    /** Signed-in users only. */
    requiresAuth?: boolean;
    /** Signed-in admins only. */
    requiresAdmin?: boolean;
    /** Signed-out visitors only (login, register). */
    guestOnly?: boolean;
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: DrawView, meta: { requiresAuth: true } },
    { path: "/login", name: "login", component: LoginView, meta: { guestOnly: true } },
    { path: "/register", name: "register", component: RegisterView, meta: { guestOnly: true } },
    { path: "/admin", name: "admin", component: AdminView, meta: { requiresAdmin: true } },
    // Last, and with no meta: an unknown URL is a 404 for everyone, signed in or not.
    // Sending a visitor to /login instead would pretend the page exists behind a session.
    { path: "/:pathMatch(.*)*", name: "not-found", component: NotFoundView },
  ],
});

// UI comfort, not security: the server enforces every rule again (requireAuth, requireAdmin).
// The store is already restored when the first navigation runs (see main.ts).
router.beforeEach((to) => {
  const auth = useAuthStore();
  const signedIn = auth.user !== null;

  if ((to.meta.requiresAuth || to.meta.requiresAdmin) && !signedIn) return { name: "login" };
  if (to.meta.requiresAdmin && !auth.isAdmin) return { name: "home" };
  if (to.meta.guestOnly && signedIn) return { name: "home" };
});

export default router;

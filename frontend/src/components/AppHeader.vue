<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();

async function logOut(): Promise<void> {
  auth.logout();
  // replace: the back button must not return to a page that needs a session.
  await router.replace("/login");
}
</script>

<template>
  <header class="navbar border-b border-base-300 bg-base-100 px-4">
    <div class="flex-1">
      <RouterLink to="/" class="text-lg font-semibold">SonicLight</RouterLink>
    </div>

    <nav v-if="auth.user" class="flex items-center gap-2 sm:gap-4">
      <!-- Hiding the link is UI comfort: requireAdmin on the server is the real check. -->
      <RouterLink v-if="auth.isAdmin" to="/admin" class="btn btn-ghost btn-sm">Admin</RouterLink>
      <span class="hidden font-mono text-sm sm:inline">{{ auth.user.userName }}</span>
      <button class="btn btn-ghost btn-sm" type="button" @click="logOut">Log out</button>
    </nav>
  </header>
</template>

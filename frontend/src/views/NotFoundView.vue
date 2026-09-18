<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();

// Same rule as after a login: an admin is sent to what concerns them, the drawings of
// everybody. Where the guard would send them anyway, so the way out is never a bounce.
const exit = computed(() => {
  if (!auth.user) return { to: "/login", label: "Log in" };
  if (auth.isAdmin) return { to: "/admin", label: "Back to the drawings" };
  return { to: "/", label: "Back to the canvas" };
});
</script>

<template>
  <main class="flex flex-1 items-center justify-center px-4 py-10">
    <!-- Same dashed frame as the admin empty state: a missing page is an empty state too. -->
    <div class="w-full max-w-md rounded-box border border-dashed border-base-300 p-10 text-center">
      <p class="font-mono text-sm text-base-content/70">404</p>
      <h1 class="mt-2 text-2xl font-semibold">Page not found</h1>
      <!-- Wherever they are sent, they are sent somewhere: a dead end needs one way out. -->
      <RouterLink class="btn btn-primary btn-sm mt-6" :to="exit.to">
        {{ exit.label }}
      </RouterLink>
    </div>
  </main>
</template>

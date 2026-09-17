<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

// Temporary page: proves the session is restored. The canvas replaces it.
const auth = useAuthStore()
</script>

<template>
  <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
    <h1 class="text-2xl font-semibold">Draw</h1>
    <p class="mt-2 text-base-content/70">
      Signed in as <span class="font-mono">{{ auth.user?.userName }}</span>. The canvas comes next.
    </p>
  </main>
</template>

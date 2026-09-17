<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getHealth } from '@/api/health'

// Temporary page: proves the front reaches the API cross-origin. The canvas replaces it.
const status = ref<'loading' | 'ok' | 'error'>('loading')
const errorMessage = ref('')

onMounted(async () => {
  try {
    await getHealth()
    status.value = 'ok'
  } catch (err) {
    status.value = 'error'
    // A CORS rejection surfaces here as an opaque TypeError, with nothing in the server log.
    errorMessage.value = err instanceof Error ? err.message : String(err)
  }
})
</script>

<template>
  <main>
    <h1>SonicLight</h1>
    <p v-if="status === 'loading'">Checking the API…</p>
    <p v-else-if="status === 'ok'">API reachable — /api/health answered ok.</p>
    <p v-else>API unreachable: {{ errorMessage }}</p>
  </main>
</template>

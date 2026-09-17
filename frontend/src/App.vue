<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-base-200">
    <AppHeader />
    <RouterView />
  </div>
</template>

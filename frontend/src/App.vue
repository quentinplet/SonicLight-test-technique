<script setup lang="ts">
import { RouterView } from "vue-router";
import AppHeader from "@/components/AppHeader.vue";
import ToastHost from "@/components/ToastHost.vue";
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-base-200">
    <AppHeader />
    <!-- Mounted once, outside the views: a toast outlives the screen that raised it. -->
    <ToastHost />
    <RouterView />
  </div>
</template>

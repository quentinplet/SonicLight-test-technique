<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useToast } from "@/composables/useToast";

const { t } = useI18n();

const { toasts, dismiss } = useToast();
</script>

<template>
  <!--
    Below the header (the navbar is 4rem tall), never over the canvas. aria-live announces
    the message without moving the focus; the toast is not an interruption.
    No transition: the stroke-by-stroke replay is meant to be the product's only animation.
  -->
  <div
    class="toast toast-top toast-center pointer-events-none top-20 z-50 w-full max-w-sm px-4"
    role="status"
    aria-live="polite"
  >
    <!--
      The container is always in the DOM — a live region inserted with its message is not
      announced — so it must not catch clicks while empty.
    -->
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="alert pointer-events-auto flex w-full items-center justify-between gap-3 text-left"
      :class="toast.variant === 'error' ? 'alert-error' : 'alert-success'"
    >
      <span>{{ toast.message }}</span>
      <button
        type="button"
        class="shrink-0 cursor-pointer p-1 leading-none opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        :aria-label="t('toast.dismiss')"
        @click="dismiss(toast.id)"
      >
        ✕
      </button>
    </div>
  </div>
</template>

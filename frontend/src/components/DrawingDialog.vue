<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import type { DrawingWithAuthor } from "@/api/admin";
import DrawingPreview from "@/components/DrawingPreview.vue";

const { t, d } = useI18n();

defineProps<{
  drawing: DrawingWithAuthor | null;
  playing: boolean;
  /** Only while this drawing is the one sounding, so it does not repaint otherwise. */
  playhead: number | null;
}>();

const emit = defineEmits<{
  listen: [drawing: DrawingWithAuthor];
  remove: [drawing: DrawingWithAuthor];
}>();

const dialog = ref<HTMLDialogElement | null>(null);

// The view drives opening and closing; the element stays here. Native <dialog>: focus trap,
// Escape and focus restoration come from the browser.
defineExpose({
  showModal: () => dialog.value?.showModal(),
  close: () => dialog.value?.close(),
});
</script>

<template>
  <dialog ref="dialog" class="modal">
    <div v-if="drawing" class="modal-box max-w-3xl">
      <h2 class="text-lg font-semibold">{{ drawing.title }}</h2>
      <p class="font-mono text-xs text-base-content/70">
        {{ drawing.userName }} ·
        {{ t("draw.savedAt", { date: d(new Date(drawing.updatedAt), "long") }) }}
      </p>
      <DrawingPreview
        class="mt-3 rounded-box border border-base-300"
        :data="drawing.data"
        :playhead="playhead"
      />

      <div class="modal-action">
        <button
          class="btn btn-sm btn-primary mr-auto cursor-pointer gap-2"
          type="button"
          :aria-pressed="playing"
          @click="emit('listen', drawing)"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect v-if="playing" x="7" y="7" width="10" height="10" rx="1.5" />
            <path
              v-else
              d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z"
            />
          </svg>
          {{ playing ? t("draw.stop") : t("draw.play") }}
        </button>
        <button
          class="btn btn-sm btn-error cursor-pointer"
          type="button"
          @click="emit('remove', drawing)"
        >
          {{ t("admin.delete") }}
        </button>
        <form method="dialog">
          <button class="btn btn-sm cursor-pointer border-base-300 bg-base-100 hover:bg-base-300">
            {{ t("admin.close") }}
          </button>
        </form>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>{{ t("admin.close") }}</button>
    </form>
  </dialog>
</template>

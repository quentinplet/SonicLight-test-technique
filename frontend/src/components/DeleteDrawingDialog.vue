<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import type { DrawingWithAuthor } from "@/api/admin";

const { t } = useI18n();

defineProps<{
  drawing: DrawingWithAuthor | null;
  deleting: boolean;
}>();

const emit = defineEmits<{ confirm: [] }>();

const dialog = ref<HTMLDialogElement | null>(null);

defineExpose({
  showModal: () => dialog.value?.showModal(),
  close: () => dialog.value?.close(),
});
</script>

<template>
  <!-- Names what is about to disappear: moderation should never be one stray click. -->
  <dialog ref="dialog" class="modal">
    <div v-if="drawing" class="modal-box max-w-md">
      <h2 class="text-lg font-semibold">{{ t("admin.confirmTitle") }}</h2>
      <p class="mt-2 text-sm text-base-content/70">
        {{ t("admin.confirmBody", { title: drawing.title, user: drawing.userName }) }}
      </p>

      <div class="modal-action">
        <button
          class="btn btn-sm btn-error cursor-pointer"
          type="button"
          :disabled="deleting"
          @click="emit('confirm')"
        >
          <span v-if="deleting" class="loading loading-spinner loading-xs" aria-hidden="true" />
          {{ t("admin.delete") }}
        </button>
        <form method="dialog">
          <button class="btn btn-sm cursor-pointer border-base-300 bg-base-100 hover:bg-base-300">
            {{ t("admin.cancel") }}
          </button>
        </form>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>{{ t("admin.cancel") }}</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import * as adminApi from "@/api/admin";
import { errorMessage } from "@/api/errors";
import { ApiError } from "@/api/http";
import DeleteDrawingDialog from "@/components/DeleteDrawingDialog.vue";
import DrawingCard from "@/components/DrawingCard.vue";
import DrawingDialog from "@/components/DrawingDialog.vue";
import { useSonification } from "@/composables/useSonification";
import { useToast } from "@/composables/useToast";

const { t, d } = useI18n();

const { notify } = useToast();

// One engine for the whole view, and the id of what it is playing: two drawings sounding at
// once would be noise, and the playhead has to know which card to run across.
const audio = useSonification();
const listening = ref<string | null>(null);

function listen(drawing: adminApi.DrawingWithAuthor): void {
  const again = listening.value === drawing.id;
  audio.stop();
  listening.value = again ? null : drawing.id;
  if (!again) audio.toggle(() => drawing.data);
}

const drawings = ref<adminApi.DrawingWithAuthor[]>([]);
const loading = ref(true);
// Inline, and only for the initial load: an action's outcome goes to a toast instead.
const error = ref<string | null>(null);

const opened = ref<adminApi.DrawingWithAuthor | null>(null);
const dialog = ref<InstanceType<typeof DrawingDialog> | null>(null);

// Deleting always goes through its own dialog, from the card icon as from the opened drawing.
const doomed = ref<adminApi.DrawingWithAuthor | null>(null);
const confirmDialog = ref<InstanceType<typeof DeleteDrawingDialog> | null>(null);
const deleting = ref(false);

// The list carries no data, so each drawing is fetched for its preview. Fine at this scale;
// with hundreds of drawings, the server would return a thumbnail or a reduced stroke set.
async function load(): Promise<void> {
  loading.value = true;
  try {
    const summaries = await adminApi.listDrawings();
    drawings.value = await Promise.all(summaries.map((summary) => adminApi.getDrawing(summary.id)));
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    loading.value = false;
  }
}

function open(drawing: adminApi.DrawingWithAuthor): void {
  opened.value = drawing;
  dialog.value?.showModal();
}

function askDeletion(drawing: adminApi.DrawingWithAuthor): void {
  doomed.value = drawing;
  confirmDialog.value?.showModal();
}

// Gone from the server: drop it from the list and say so, whichever path got us here.
function forget(drawing: adminApi.DrawingWithAuthor): void {
  if (listening.value === drawing.id) {
    audio.stop();
    listening.value = null;
  }
  drawings.value = drawings.value.filter((other) => other.id !== drawing.id);
  notify(t("admin.deleted", { title: drawing.title, user: drawing.userName }));
}

async function remove(): Promise<void> {
  const drawing = doomed.value;
  if (!drawing) return;
  deleting.value = true;
  try {
    await adminApi.deleteDrawing(drawing.id);
    forget(drawing);
  } catch (err) {
    // 404: someone deleted it first, or this list is stale. Either way it is gone — not an error.
    if (err instanceof ApiError && err.status === 404) forget(drawing);
    else notify(errorMessage(err), "error");
  } finally {
    deleting.value = false;
    confirmDialog.value?.close();
    dialog.value?.close();
  }
}

onMounted(load);
</script>

<template>
  <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
    <h1 class="text-xl font-semibold">{{ t("admin.title") }}</h1>

    <div v-if="error" role="alert" class="alert alert-error alert-soft mt-4">
      {{ error }}
    </div>
    <!-- Roughly a card's height, so the grid does not jump when the drawings land. -->
    <div
      v-else-if="loading"
      class="mt-4 flex min-h-64 items-center justify-center gap-3 text-base-content/70"
      role="status"
    >
      <span class="loading loading-spinner loading-lg" aria-hidden="true" />
      {{ t("admin.loading") }}
    </div>

    <div
      v-else-if="drawings.length === 0"
      class="mt-4 rounded-box border border-dashed border-base-300 p-10 text-center text-base-content/70"
    >
      {{ t("admin.empty") }}
    </div>

    <ul v-else class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DrawingCard
        v-for="drawing in drawings"
        :key="drawing.id"
        :drawing="drawing"
        :playing="listening === drawing.id"
        :playhead="listening === drawing.id ? audio.head.value : null"
        @open="open(drawing)"
        @listen="listen(drawing)"
        @remove="askDeletion(drawing)"
      />
    </ul>

    <DrawingDialog
      ref="dialog"
      :drawing="opened"
      :playing="listening === opened?.id"
      :playhead="listening === opened?.id ? audio.head.value : null"
      @listen="listen"
      @remove="askDeletion"
    />

    <DeleteDrawingDialog
      ref="confirmDialog"
      :drawing="doomed"
      :deleting="deleting"
      @confirm="remove"
    />
  </main>
</template>

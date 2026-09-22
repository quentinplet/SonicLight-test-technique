<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import * as adminApi from "@/api/admin";
import { errorMessage } from "@/api/errors";
import { ApiError } from "@/api/http";
import DrawingCard from "@/components/DrawingCard.vue";
import DrawingPreview from "@/components/DrawingPreview.vue";
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
const dialog = ref<HTMLDialogElement | null>(null);

// Deleting always goes through its own dialog, from the card icon as from the opened drawing.
const doomed = ref<adminApi.DrawingWithAuthor | null>(null);
const confirmDialog = ref<HTMLDialogElement | null>(null);
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
  // Native <dialog>: focus trap, Escape and focus restoration come from the browser.
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

    <dialog ref="dialog" class="modal">
      <div v-if="opened" class="modal-box max-w-3xl">
        <h2 class="text-lg font-semibold">{{ opened.title }}</h2>
        <p class="font-mono text-xs text-base-content/70">
          {{ opened.userName }} ·
          {{ t("draw.savedAt", { date: d(new Date(opened.updatedAt), "long") }) }}
        </p>
        <DrawingPreview
          class="mt-3 rounded-box border border-base-300"
          :data="opened.data"
          :playhead="listening === opened.id ? audio.head.value : null"
        />

        <div class="modal-action">
          <button
            class="btn btn-sm btn-primary mr-auto cursor-pointer gap-2"
            type="button"
            :aria-pressed="listening === opened.id"
            @click="listen(opened)"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect v-if="listening === opened.id" x="7" y="7" width="10" height="10" rx="1.5" />
              <path
                v-else
                d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z"
              />
            </svg>
            {{ listening === opened.id ? t("draw.stop") : t("draw.play") }}
          </button>
          <button
            class="btn btn-sm btn-error cursor-pointer"
            type="button"
            @click="askDeletion(opened)"
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

    <dialog ref="confirmDialog" class="modal">
      <div v-if="doomed" class="modal-box max-w-md">
        <h2 class="text-lg font-semibold">{{ t("admin.confirmTitle") }}</h2>
        <p class="mt-2 text-sm text-base-content/70">
          {{ t("admin.confirmBody", { title: doomed.title, user: doomed.userName }) }}
        </p>

        <div class="modal-action">
          <button
            class="btn btn-sm btn-error cursor-pointer"
            type="button"
            :disabled="deleting"
            @click="remove"
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
  </main>
</template>

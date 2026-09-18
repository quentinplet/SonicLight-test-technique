<script setup lang="ts">
import { onMounted, ref } from "vue";
import * as adminApi from "@/api/admin";
import { errorMessage } from "@/api/errors";
import { ApiError } from "@/api/http";
import DrawingPreview from "@/components/DrawingPreview.vue";
import { useToast } from "@/composables/useToast";

const { notify } = useToast();

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
  drawings.value = drawings.value.filter((other) => other.id !== drawing.id);
  notify(`“${drawing.title}” by ${drawing.userName} was deleted successfully.`);
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
    <h1 class="text-xl font-semibold">Drawings</h1>

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
      Loading drawings…
    </div>

    <div
      v-else-if="drawings.length === 0"
      class="mt-4 rounded-box border border-dashed border-base-300 p-10 text-center text-base-content/70"
    >
      Nobody has saved a drawing yet.
    </div>

    <ul v-else class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <!-- `card` is a class, so the list keeps its semantics and still looks like a card. -->
      <li
        v-for="drawing in drawings"
        :key="drawing.id"
        class="card relative overflow-hidden border border-base-300 bg-base-100"
      >
        <button
          type="button"
          class="cursor-pointer text-left transition-opacity hover:opacity-80"
          @click="open(drawing)"
        >
          <DrawingPreview :data="drawing.data" />
          <div class="card-body gap-0 border-t border-base-300 p-3">
            <p class="truncate pr-10 font-semibold">{{ drawing.title }}</p>
            <p class="truncate pr-10 font-mono text-xs text-base-content/70">
              {{ drawing.userName }} ·
              {{ new Date(drawing.updatedAt).toLocaleDateString() }}
            </p>
          </div>
        </button>

        <!-- Red, and behind a confirmation: moderation should never be one stray click. -->
        <button
          type="button"
          class="btn btn-sm btn-circle absolute right-2 bottom-2 cursor-pointer border-error bg-base-100 text-error hover:border-error hover:bg-error hover:text-error-content"
          :aria-label="`Delete ${drawing.title} by ${drawing.userName}`"
          @click="askDeletion(drawing)"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
            />
          </svg>
        </button>
      </li>
    </ul>

    <dialog ref="dialog" class="modal">
      <div v-if="opened" class="modal-box max-w-3xl">
        <h2 class="text-lg font-semibold">{{ opened.title }}</h2>
        <p class="font-mono text-xs text-base-content/70">
          {{ opened.userName }} · saved
          {{ new Date(opened.updatedAt).toLocaleString() }}
        </p>
        <DrawingPreview class="mt-3 rounded-box border border-base-300" :data="opened.data" />

        <div class="modal-action">
          <button
            class="btn btn-sm btn-error cursor-pointer"
            type="button"
            @click="askDeletion(opened)"
          >
            Delete
          </button>
          <form method="dialog">
            <button class="btn btn-sm cursor-pointer border-base-300 bg-base-100 hover:bg-base-300">
              Close
            </button>
          </form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>Close</button></form>
    </dialog>

    <dialog ref="confirmDialog" class="modal">
      <div v-if="doomed" class="modal-box max-w-md">
        <h2 class="text-lg font-semibold">Delete this drawing?</h2>
        <p class="mt-2 text-sm text-base-content/70">
          “{{ doomed.title }}” by {{ doomed.userName }} will be removed for good. This cannot be
          undone.
        </p>

        <div class="modal-action">
          <button
            class="btn btn-sm btn-error cursor-pointer"
            type="button"
            :disabled="deleting"
            @click="remove"
          >
            <span v-if="deleting" class="loading loading-spinner loading-xs" aria-hidden="true" />
            Delete
          </button>
          <form method="dialog">
            <button class="btn btn-sm cursor-pointer border-base-300 bg-base-100 hover:bg-base-300">
              Cancel
            </button>
          </form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>Cancel</button>
      </form>
    </dialog>
  </main>
</template>

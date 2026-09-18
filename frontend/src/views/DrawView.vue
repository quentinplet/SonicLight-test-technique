<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import * as drawingApi from "@/api/drawing";
import { errorMessage } from "@/api/errors";
import { ApiError } from "@/api/http";
import DrawingToolbar from "@/components/DrawingToolbar.vue";
import EditableTitle from "@/components/EditableTitle.vue";
import { countPoints } from "@/composables/renderStrokes";
import { PALETTE, useDrawing, WIDTHS, type Tool } from "@/composables/useDrawing";
import { useToast } from "@/composables/useToast";

const { notify } = useToast();

const canvas = ref<HTMLCanvasElement | null>(null);
const tool = ref<Tool>({ color: PALETTE[0].hex, width: WIDTHS[1].value });

const drawing = useDrawing(canvas, tool);

const title = ref("");
const savedTitle = ref("");
const savedAt = ref<string | null>(null);
const savedRevision = ref(0);

const strokesChanged = computed(() => drawing.revision.value !== savedRevision.value);
// A renamed drawing is worth saving on its own, strokes untouched.
const unsaved = computed(() => strokesChanged.value || title.value.trim() !== savedTitle.value);
const saving = ref(false);
const loading = ref(true);
// Inline, and only for the initial load: an action's outcome goes to a toast instead.
const error = ref<string | null>(null);

// One screen: it opens on the drawing already saved, and saving replaces it.
async function loadSaved(): Promise<void> {
  try {
    const saved = await drawingApi.getDrawing();
    title.value = saved.title;
    savedTitle.value = saved.title;
    savedAt.value = saved.updatedAt;
    drawing.load(saved.data.strokes);
    savedRevision.value = drawing.revision.value;
  } catch (err) {
    // 404 means "nothing drawn yet": a blank canvas, not a failure.
    if (!(err instanceof ApiError) || err.status !== 404) error.value = errorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  // An empty canvas can be saved: with no delete button, that is how a drawing is wiped.
  saving.value = true;
  try {
    // PUT: it creates the drawing or replaces the previous one, whichever applies.
    // An empty title leaves the saved one untouched.
    const saved = await drawingApi.saveDrawing({
      title: title.value.trim() || undefined,
      data: drawing.data.value,
    });
    title.value = saved.title;
    savedTitle.value = saved.title;
    savedAt.value = saved.updatedAt;
    savedRevision.value = drawing.revision.value;
    notify("Drawing saved successfully !", "success");
  } catch (err) {
    notify(errorMessage(err), "error");
  } finally {
    saving.value = false;
  }
}

// Three lines, and the difference between a demo and a tool.
function onKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key === "z") {
    event.preventDefault();
    drawing.undo();
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  void loadSaved();
});
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-4">
    <!--
      The width is capped by the viewport height, so the 3:2 canvas and its toolbar always
      fit on screen: nobody should scroll to reach the palette.
    -->
    <div class="mx-auto w-full" style="max-width: calc((100dvh - 15rem) * 1.5)">
      <!-- Click the title to rename. Left blank, the server keeps the one already saved. -->
      <EditableTitle v-model="title" placeholder="Untitled drawing" />
      <!-- touch-none: without touch-action, drawing with a finger scrolls the page instead. -->
      <canvas
        ref="canvas"
        class="mt-3 w-full cursor-crosshair touch-none rounded-box border border-base-300"
        style="aspect-ratio: 3 / 2"
        @pointerdown="drawing.onPointerDown"
        @pointermove="drawing.onPointerMove"
        @pointerup="drawing.onPointerUp"
        @pointercancel="drawing.onPointerUp"
      />

      <DrawingToolbar
        v-model="tool"
        :is-empty="drawing.isEmpty.value"
        :unsaved="unsaved"
        :saving="saving"
        @undo="drawing.undo"
        @clear="drawing.clear"
        @save="save"
      />

      <div v-if="error" role="alert" class="alert alert-error alert-soft mt-3">
        {{ error }}
      </div>

      <!-- Same line, same height either way: the meta line must not jump when data lands. -->
      <p class="mt-2 font-mono text-xs text-base-content/70">
        <template v-if="loading">
          <span class="loading loading-spinner loading-xs mr-1 align-middle" aria-hidden="true" />
          Loading your drawing…
        </template>
        <template v-else>
          {{ drawing.data.value.strokes.length }} strokes ·
          {{ countPoints(drawing.data.value) }} points
          <span v-if="savedAt"> · saved {{ new Date(savedAt).toLocaleString() }}</span>
          <span v-else> · not saved yet</span>
        </template>
      </p>
    </div>
  </main>
</template>

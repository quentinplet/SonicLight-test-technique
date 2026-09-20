<script setup lang="ts">
import { PALETTE, WIDTHS, type Tool } from "@/canvas/tools";

const tool = defineModel<Tool>({ required: true });

// Clear only needs something on the canvas — including a drawing loaded from the server.
// Undo needs a step to walk back, and saving asks what changed since the last save.
defineProps<{ isEmpty: boolean; canUndo: boolean; unsaved: boolean; saving: boolean }>();
const emit = defineEmits<{ undo: []; clear: []; save: [] }>();

/** Picking a colour means painting with it, so it leaves the eraser. */
function pick(colour: string): void {
  tool.value.color = colour;
  tool.value.mode = "draw";
}
</script>

<template>
  <div class="mt-3 grid justify-center items-center gap-3 xl:flex xl:justify-between xl:gap-6">
    <div class="flex flex-wrap items-center justify-center gap-3">
      <div class="flex items-center gap-2" role="group" aria-label="Colour">
        <button
          v-for="colour in PALETTE"
          :key="colour.hex"
          type="button"
          class="size-7 cursor-pointer rounded-full border bg-(--swatch) transition-transform"
          :class="
            tool.color === colour.hex && tool.mode === 'draw'
              ? 'scale-115 border-base-content'
              : 'border-base-300'
          "
          :style="{ '--swatch': colour.hex }"
          :aria-label="colour.name"
          :aria-pressed="tool.color === colour.hex && tool.mode === 'draw'"
          @click="pick(colour.hex)"
        />
      </div>

      <!-- Dropped when the row wraps: a rule at the start of a line separates nothing. -->
      <span class="hidden h-6 w-px bg-base-300 sm:block" aria-hidden="true" />

      <div class="flex items-center gap-3" role="group" aria-label="Stroke width and eraser">
        <label class="flex items-center gap-1 text-sm">
          <span class="sr-only sm:not-sr-only">Width</span>
          <select
            v-model="tool.width"
            class="select select-sm w-28 cursor-pointer border-base-300 bg-base-100"
            aria-label="Stroke width"
          >
            <option v-for="width in WIDTHS" :key="width.value" :value="width.value">
              {{ width.glyph }}&nbsp; {{ width.name }}
            </option>
          </select>
        </label>
        <div class="flex items-center gap-1 text-sm">
          <span class="sr-only sm:not-sr-only" aria-hidden="true">Eraser</span>
          <button
            class="btn btn-square btn-sm cursor-pointer"
            :class="
              tool.mode === 'erase'
                ? 'border-base-content bg-base-300'
                : 'border-base-300 bg-base-100 hover:bg-base-300'
            "
            type="button"
            aria-label="Eraser"
            title="Eraser — removes whole strokes"
            :aria-pressed="tool.mode === 'erase'"
            @click="tool.mode = tool.mode === 'erase' ? 'draw' : 'erase'"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M16.24 3.56a2 2 0 0 0-2.83 0L2.81 14.16a2 2 0 0 0 0 2.84l3.53 3.53a4.008 4.008 0 0 0 5.66 0l9.19-9.19a2 2 0 0 0 0-2.83zm-5.65 15.55a2 2 0 0 1-2.83 0l-3.54-3.53l4.95-4.95l4.95 4.95z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-2">
      <!-- base-100, not the default transparent button: the page itself is base-200. -->
      <button
        class="btn btn-sm min-w-24 cursor-pointer border-base-300 bg-base-100 hover:bg-base-300"
        type="button"
        :disabled="!canUndo"
        @click="emit('undo')"
      >
        Undo
      </button>
      <button
        class="btn btn-sm min-w-24 cursor-pointer border-base-300 bg-base-100 hover:bg-base-300"
        type="button"
        :disabled="isEmpty"
        @click="emit('clear')"
      >
        Clear
      </button>
      <button
        class="btn btn-sm btn-primary min-w-24 cursor-pointer"
        type="button"
        :disabled="saving || !unsaved"
        @click="emit('save')"
      >
        <span v-if="saving" class="loading loading-spinner loading-xs" aria-hidden="true" />
        Save
      </button>
    </div>
  </div>
</template>

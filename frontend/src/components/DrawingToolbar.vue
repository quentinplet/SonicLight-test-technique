<script setup lang="ts">
import { PALETTE, WIDTHS, type Tool } from "@/composables/useDrawing";

const tool = defineModel<Tool>({ required: true });

// Undo and clear only need something on the canvas — including a drawing loaded from the
// server. Saving is the only button that asks what changed since the last save.
defineProps<{ isEmpty: boolean; unsaved: boolean; saving: boolean; playing: boolean }>();
const emit = defineEmits<{ undo: []; clear: []; save: []; listen: [] }>();
</script>

<template>
  <!-- Below the canvas, never over it: a floating control ends up under the cursor. -->
  <div class="mt-3 flex flex-wrap items-center gap-3">
    <div class="flex items-center gap-2" role="group" aria-label="Colour">
      <button
        v-for="colour in PALETTE"
        :key="colour.hex"
        type="button"
        class="size-7 cursor-pointer rounded-full border bg-(--swatch) transition-transform"
        :class="tool.color === colour.hex ? 'scale-115 border-base-content' : 'border-base-300'"
        :style="{ '--swatch': colour.hex }"
        :aria-label="colour.name"
        :aria-pressed="tool.color === colour.hex"
        @click="tool.color = colour.hex"
      />
    </div>

    <label class="flex items-center gap-2 text-sm">
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

    <div class="ml-auto flex items-center gap-2">
      <button
        class="btn btn-sm min-w-24 cursor-pointer border-base-300 bg-base-100 hover:bg-base-300"
        type="button"
        :disabled="isEmpty"
        :aria-pressed="playing"
        @click="emit('listen')"
      >
        {{ playing ? "Stop" : "Listen" }}
      </button>
      <!-- base-100, not the default transparent button: the page itself is base-200. -->
      <button
        class="btn btn-sm min-w-24 cursor-pointer border-base-300 bg-base-100 hover:bg-base-300"
        type="button"
        :disabled="isEmpty"
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

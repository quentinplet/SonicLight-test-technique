<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import DrawingToolbar from '@/components/DrawingToolbar.vue'
import { countPoints } from '@/composables/renderStrokes'
import { PALETTE, useDrawing, WIDTHS, type Tool } from '@/composables/useDrawing'

const canvas = ref<HTMLCanvasElement | null>(null)
const tool = ref<Tool>({ color: PALETTE[0].hex, width: WIDTHS[1].value })

const drawing = useDrawing(canvas, tool)

// Three lines, and the difference between a demo and a tool.
function onKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
    event.preventDefault()
    drawing.undo()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-4">
    <!--
      The width is capped by the viewport height, so the 3:2 canvas and its toolbar always
      fit on screen: nobody should scroll to reach the palette.
    -->
    <div class="mx-auto w-full" style="max-width: calc((100dvh - 15rem) * 1.5)">
      <h1 class="text-center text-xl font-semibold">Draw</h1>
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
        @undo="drawing.undo"
        @clear="drawing.clear"
      />

      <p class="mt-2 font-mono text-xs text-base-content/70">
        {{ drawing.data.value.strokes.length }} strokes · {{ countPoints(drawing.data.value) }} points
      </p>
    </div>
  </main>
</template>

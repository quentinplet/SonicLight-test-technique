<script setup lang="ts">
import { ref } from 'vue'
import { countPoints } from '@/composables/renderStrokes'
import { useDrawing, type Tool } from '@/composables/useDrawing'

const canvas = ref<HTMLCanvasElement | null>(null)
// One colour and one width for now: the toolbar comes next.
const tool = ref<Tool>({ color: '#18181b', width: 0.004 })

const drawing = useDrawing(canvas, tool)
</script>

<template>
  <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
    <h1 class="text-2xl font-semibold">Draw</h1>

    <!-- touch-none: without touch-action, drawing with a finger scrolls the page instead. -->
    <canvas
      ref="canvas"
      class="mt-4 w-full touch-none rounded-box border border-base-300"
      style="aspect-ratio: 3 / 2"
      @pointerdown="drawing.onPointerDown"
      @pointermove="drawing.onPointerMove"
      @pointerup="drawing.onPointerUp"
      @pointercancel="drawing.onPointerUp"
    />

    <p class="mt-3 font-mono text-sm text-base-content/70">
      {{ drawing.data.value.strokes.length }} strokes · {{ countPoints(drawing.data.value) }} points
    </p>
  </main>
</template>

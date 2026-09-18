<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { renderStrokes } from "@/canvas/renderStrokes";
import { ASPECT_RATIO } from "@/composables/useDrawing";
import type { DrawingData } from "@/types/drawing";

// The same render function as the editor, at thumbnail size or full size.
const props = defineProps<{ data: DrawingData | null }>();

const canvas = ref<HTMLCanvasElement | null>(null);

function paint(): void {
  const element = canvas.value;
  const ctx = element?.getContext("2d");
  if (!element || !ctx || !props.data) return;

  const width = element.clientWidth;
  // Backing store in device pixels, drawing in CSS pixels, or strokes blur on retina.
  element.width = width * devicePixelRatio;
  element.height = (width / ASPECT_RATIO) * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  renderStrokes(ctx, props.data, { x: 0, y: 0, width, height: width / ASPECT_RATIO });
}

onMounted(() => {
  paint();
  window.addEventListener("resize", paint);
});
onBeforeUnmount(() => window.removeEventListener("resize", paint));
watch(() => props.data, paint);
</script>

<template>
  <!-- The height is reserved by the aspect ratio, so the grid never jumps when data lands. -->
  <canvas ref="canvas" class="w-full bg-base-100" style="aspect-ratio: 3 / 2" />
</template>

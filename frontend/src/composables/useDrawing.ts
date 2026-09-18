import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { renderStrokes } from '@/composables/renderStrokes'
import type { DrawingData, Point, Stroke } from '@/types/drawing'

/** Fixed shape, so every drawing shares one aspect ratio. */
export const ASPECT_RATIO = 1.5
export const BACKGROUND = '#ffffff'

// Below this distance (in normalised units, ~2 px on a 1000 px canvas) a point adds nothing
// but weight: a two-second stroke emits hundreds of pointermove events.
const MIN_DISTANCE = 0.002

export interface Tool {
  color: string
  width: number
}

export function useDrawing(canvas: Ref<HTMLCanvasElement | null>, tool: Ref<Tool>) {
  const strokes = ref<Stroke[]>([])
  const current = ref<Stroke | null>(null)

  const data = computed<DrawingData>(() => ({
    version: 1,
    aspectRatio: ASPECT_RATIO,
    background: BACKGROUND,
    strokes: current.value ? [...strokes.value, current.value] : strokes.value,
  }))

  const isEmpty = computed(() => data.value.strokes.length === 0)

  function draw(): void {
    const element = canvas.value
    const ctx = element?.getContext('2d')
    if (!element || !ctx) return
    const width = element.width / devicePixelRatio
    renderStrokes(ctx, data.value, { x: 0, y: 0, width, height: width / ASPECT_RATIO })
  }

  /** Resizing a canvas clears it, so every resize repaints from the strokes. */
  function resize(): void {
    const element = canvas.value
    if (!element) return
    const cssWidth = element.clientWidth
    // Backing store in device pixels, drawing in CSS pixels: without this, retina blurs.
    element.width = cssWidth * devicePixelRatio
    element.height = (cssWidth / ASPECT_RATIO) * devicePixelRatio
    element.getContext('2d')?.scale(devicePixelRatio, devicePixelRatio)
    draw()
  }

  function pointFrom(event: PointerEvent): Point {
    const box = canvas.value!.getBoundingClientRect()
    // Normalised at capture: no pixel value is ever stored or sent.
    return {
      x: clamp((event.clientX - box.left) / box.width),
      y: clamp((event.clientY - box.top) / box.height),
    }
  }

  function onPointerDown(event: PointerEvent): void {
    // The stroke survives the cursor leaving the canvas, and pointerup always fires.
    canvas.value?.setPointerCapture(event.pointerId)
    current.value = { color: tool.value.color, width: tool.value.width, points: [pointFrom(event)] }
    draw()
  }

  function onPointerMove(event: PointerEvent): void {
    const stroke = current.value
    if (!stroke) return
    const point = pointFrom(event)
    const last = stroke.points[stroke.points.length - 1]!
    if (Math.hypot(point.x - last.x, point.y - last.y) < MIN_DISTANCE) return
    stroke.points.push(point)
    draw()
  }

  function onPointerUp(): void {
    if (!current.value) return
    strokes.value.push(current.value)
    current.value = null
    draw()
  }

  function undo(): void {
    strokes.value.pop()
    draw()
  }

  function clear(): void {
    strokes.value = []
    current.value = null
    draw()
  }

  onMounted(() => {
    resize()
    window.addEventListener('resize', resize)
  })
  onBeforeUnmount(() => window.removeEventListener('resize', resize))
  watch(canvas, resize)

  return { data, isEmpty, onPointerDown, onPointerMove, onPointerUp, undo, clear }
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value))
}

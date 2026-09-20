import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import { strokesOutside } from "@/canvas/hitTest";
import { renderPlayhead, renderStrokes } from "@/canvas/renderStrokes";
import { ASPECT_RATIO, BACKGROUND, type Tool } from "@/canvas/tools";
import type { DrawingData, Point, Stroke } from "@/types/drawing";

// Below this distance (in normalised units, ~2 px on a 1000 px canvas) a point adds nothing
// but weight: a two-second stroke emits hundreds of pointermove events.
const MIN_DISTANCE = 0.002;

/** Eraser reach, as a fraction of the canvas width: ~20 px on a 1000 px canvas. */
const ERASER_RADIUS = 0.02;

/** Undo depth. A snapshot is an array of references, but an unbounded stack still grows. */
const MAX_HISTORY = 50;

export function useDrawing(
  canvas: Ref<HTMLCanvasElement | null>,
  tool: Ref<Tool>,
  /** Playhead position in [0, 1] while a drawing is being listened to, null otherwise. */
  playhead?: Ref<number | null>,
) {
  const strokes = ref<Stroke[]>([]);
  const current = ref<Stroke | null>(null);
  // Bumped by every change, so a view can tell whether the canvas moved since a save.
  const revision = ref(0);

  /**
   * Undo is a stack of past states, not a pop of the last stroke: once the eraser can take
   * strokes away, undo has to be able to put them back. A snapshot copies the array, not
   * the strokes — a stroke is never mutated once pushed, so the references are enough.
   */
  const history = ref<Stroke[][]>([]);
  const canUndo = computed(() => history.value.length > 0);
  // One snapshot per gesture, so a whole eraser swipe is undone in a single step.
  let gestureSnapshot = false;
  let erasing = false;

  function remember(): void {
    history.value.push(strokes.value.slice());
    if (history.value.length > MAX_HISTORY) history.value.shift();
  }

  const data = computed<DrawingData>(() => ({
    version: 1,
    aspectRatio: ASPECT_RATIO,
    background: BACKGROUND,
    strokes: current.value ? [...strokes.value, current.value] : strokes.value,
  }));

  const isEmpty = computed(() => data.value.strokes.length === 0);

  function draw(): void {
    const element = canvas.value;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const width = element.width / devicePixelRatio;
    const box = { x: 0, y: 0, width, height: width / ASPECT_RATIO };
    renderStrokes(ctx, data.value, box);
    if (playhead?.value != null) renderPlayhead(ctx, box, playhead.value);
  }

  /** Resizing a canvas clears it, so every resize repaints from the strokes. */
  function resize(): void {
    const element = canvas.value;
    if (!element) return;
    const cssWidth = element.clientWidth;
    // Backing store in device pixels, drawing in CSS pixels: without this, retina blurs.
    element.width = cssWidth * devicePixelRatio;
    element.height = (cssWidth / ASPECT_RATIO) * devicePixelRatio;
    element.getContext("2d")?.scale(devicePixelRatio, devicePixelRatio);
    draw();
  }

  function pointFrom(event: PointerEvent): Point {
    const box = canvas.value!.getBoundingClientRect();
    // Normalised at capture: no pixel value is ever stored or sent.
    return {
      x: clamp((event.clientX - box.left) / box.width),
      y: clamp((event.clientY - box.top) / box.height),
    };
  }

  /** Rubs out every stroke under the eraser. Does nothing over blank canvas. */
  function erase(point: Point): void {
    const kept = strokesOutside(strokes.value, point, ERASER_RADIUS, ASPECT_RATIO);
    if (kept === strokes.value) return;

    // Snapshotted on the first removal, not on pointerdown: a swipe that rubs out nothing
    // would otherwise leave an undo step that undoes nothing.
    if (!gestureSnapshot) {
      remember();
      gestureSnapshot = true;
    }
    strokes.value = kept;
    revision.value++;
    draw();
  }

  function onPointerDown(event: PointerEvent): void {
    // The stroke survives the cursor leaving the canvas, and pointerup always fires.
    canvas.value?.setPointerCapture(event.pointerId);
    const point = pointFrom(event);

    if (tool.value.mode === "erase") {
      erasing = true;
      erase(point);
      return;
    }

    current.value = { color: tool.value.color, width: tool.value.width, points: [point] };
    draw();
  }

  function onPointerMove(event: PointerEvent): void {
    if (erasing) return erase(pointFrom(event));

    const stroke = current.value;
    if (!stroke) return;
    const point = pointFrom(event);
    const last = stroke.points[stroke.points.length - 1]!;
    if (Math.hypot(point.x - last.x, point.y - last.y) < MIN_DISTANCE) return;
    stroke.points.push(point);
    draw();
  }

  function onPointerUp(): void {
    erasing = false;
    gestureSnapshot = false;
    if (!current.value) return;
    remember();
    strokes.value.push(current.value);
    current.value = null;
    revision.value++;
    draw();
  }

  /** Puts a saved drawing back on the canvas, so the editor opens on it. */
  function load(saved: Stroke[]): void {
    strokes.value = saved;
    current.value = null;
    // A drawing that was just opened has nothing to undo yet.
    history.value = [];
    revision.value++;
    draw();
  }

  function undo(): void {
    const previous = history.value.pop();
    if (!previous) return;
    strokes.value = previous;
    current.value = null;
    revision.value++;
    draw();
  }

  function clear(): void {
    if (!isEmpty.value) remember();
    strokes.value = [];
    current.value = null;
    revision.value++;
    draw();
  }

  onMounted(() => {
    resize();
    window.addEventListener("resize", resize);
  });
  onBeforeUnmount(() => window.removeEventListener("resize", resize));
  watch(canvas, resize);
  if (playhead) watch(playhead, draw);

  return {
    data,
    isEmpty,
    canUndo,
    revision,
    load,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    undo,
    clear,
  };
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

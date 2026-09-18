import type { DrawingData } from '@/types/drawing'

/** Where the drawing is painted, in CSS pixels. */
export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * The one render function: editor, replay and (later) admin thumbnail all call it.
 * `upTo` is how many points to paint in total, which is what animates a replay.
 * Coordinates are denormalised here, and only here.
 */
export function renderStrokes(
  ctx: CanvasRenderingContext2D,
  data: DrawingData,
  box: Box,
  upTo: number = Number.POSITIVE_INFINITY,
): void {
  ctx.fillStyle = data.background
  ctx.fillRect(box.x, box.y, box.width, box.height)

  // Round caps and joins, or a fast stroke shows its segments and its angles.
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  let painted = 0
  for (const stroke of data.strokes) {
    if (painted >= upTo) return

    const points = stroke.points.slice(0, Math.max(1, upTo - painted))
    painted += stroke.points.length

    ctx.strokeStyle = stroke.color
    // Width is a fraction of the canvas width, so it scales with the box.
    ctx.lineWidth = Math.max(1, stroke.width * box.width)
    ctx.beginPath()
    for (const point of points) {
      ctx.lineTo(box.x + point.x * box.width, box.y + point.y * box.height)
    }
    // A single point still deserves a dot: lineTo twice on the same spot draws nothing.
    if (points.length === 1) ctx.lineTo(box.x + points[0]!.x * box.width + 0.01, box.y + points[0]!.y * box.height)
    ctx.stroke()
  }
}

/** Total number of points, the ceiling a replay counts up to. */
export function countPoints(data: DrawingData): number {
  return data.strokes.reduce((total, stroke) => total + stroke.points.length, 0)
}

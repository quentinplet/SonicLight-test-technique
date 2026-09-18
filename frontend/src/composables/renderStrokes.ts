import type { DrawingData } from '@/types/drawing'

/** Where the drawing is painted, in CSS pixels. */
export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * The one render function: the editor and the saved-drawing page both call it, and so will
 * the admin thumbnail. Coordinates are denormalised here, and only here.
 */
export function renderStrokes(ctx: CanvasRenderingContext2D, data: DrawingData, box: Box): void {
  ctx.fillStyle = data.background
  ctx.fillRect(box.x, box.y, box.width, box.height)

  // Round caps and joins, or a fast stroke shows its segments and its angles.
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const stroke of data.strokes) {
    ctx.strokeStyle = stroke.color
    // Width is a fraction of the canvas width, so it scales with the box.
    ctx.lineWidth = Math.max(1, stroke.width * box.width)
    ctx.beginPath()
    for (const point of stroke.points) {
      ctx.lineTo(box.x + point.x * box.width, box.y + point.y * box.height)
    }
    // A single point still deserves a dot: lineTo twice on the same spot draws nothing.
    const first = stroke.points[0]!
    if (stroke.points.length === 1) ctx.lineTo(box.x + first.x * box.width + 0.01, box.y + first.y * box.height)
    ctx.stroke()
  }
}

/** Total number of points — shown next to the canvas while drawing. */
export function countPoints(data: DrawingData): number {
  return data.strokes.reduce((total, stroke) => total + stroke.points.length, 0)
}

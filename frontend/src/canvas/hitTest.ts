/**
 * Geometry for the eraser: which strokes does a point touch? Pure, like renderStrokes —
 * it reads the drawing format and knows nothing of Vue or of a canvas element.
 */
import type { Point, Stroke } from "@/types/drawing";

/**
 * Shortest distance from `point` to the segment a—b, in canvas-WIDTH units.
 *
 * x and y are normalised independently, so a raw hypot would stretch the y axis: on a 3:2
 * canvas, a point 0.1 above a stroke would read as far as one 0.15 to its side. Dividing dy
 * by the aspect ratio puts both axes into the same unit — the one stroke widths use.
 */
function distanceToSegment(point: Point, a: Point, b: Point, aspectRatio: number): number {
  const segmentX = b.x - a.x;
  const segmentY = (b.y - a.y) / aspectRatio;
  const pointX = point.x - a.x;
  const pointY = (point.y - a.y) / aspectRatio;

  // Projection of the point onto the segment, clamped to its ends. A stroke can hold a
  // single point, and the segment then collapses to it: length 0, projection 0.
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  const projection =
    lengthSquared === 0
      ? 0
      : Math.min(1, Math.max(0, (pointX * segmentX + pointY * segmentY) / lengthSquared));

  return Math.hypot(pointX - projection * segmentX, pointY - projection * segmentY);
}

/** True when the eraser, a disc of `radius` around `point`, touches the stroke's ink. */
function hits(stroke: Stroke, point: Point, radius: number, aspectRatio: number): boolean {
  // Half the thickness, because a stroke is painted on both sides of its path.
  const threshold = radius + stroke.width / 2;

  const first = stroke.points[0];
  if (!first) return false;

  // Starting from `first` makes the single-point case fall out: the first segment is a—a.
  let previous = first;
  for (const next of stroke.points) {
    if (distanceToSegment(point, previous, next, aspectRatio) <= threshold) return true;
    previous = next;
  }
  return false;
}

/**
 * The strokes left after rubbing at `point`. Returns the same array when nothing is
 * touched, so the caller can tell an erasure from a swipe over blank canvas.
 */
export function strokesOutside(
  strokes: Stroke[],
  point: Point,
  radius: number,
  aspectRatio: number,
): Stroke[] {
  const kept = strokes.filter((stroke) => !hits(stroke, point, radius, aspectRatio));
  return kept.length === strokes.length ? strokes : kept;
}

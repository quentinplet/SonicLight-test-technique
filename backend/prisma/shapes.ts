import { ASPECT_RATIO } from "../src/schemas/drawing.schema.js";
import type { DrawingData, Point, Stroke } from "../src/types/drawing.js";

/**
 * Demo drawings, generated rather than copied from real ones: a handful of formulas read
 * better than hundreds of transcribed points — and they show the format is geometry.
 * Coordinates are normalised, so these look the same at any canvas size.
 */

function drawing(strokes: Stroke[]): DrawingData {
  return { version: 1, aspectRatio: ASPECT_RATIO, background: "#ffffff", strokes };
}

/** y is squashed by the aspect ratio, or a circle would come out as an oval. */
function point(x: number, y: number): Point {
  return { x: clamp(0.5 + x), y: clamp(0.5 + y * ASPECT_RATIO) };
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function spiral(color: string): DrawingData {
  const points: Point[] = [];
  for (let step = 0; step <= 240; step++) {
    const angle = (step / 240) * Math.PI * 8;
    const radius = 0.03 + (step / 240) * 0.42;
    points.push(point(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  return drawing([{ color, width: 0.004, points }]);
}

export function waves(colors: string[]): DrawingData {
  const strokes = colors.map((color, index) => {
    const points: Point[] = [];
    for (let step = 0; step <= 120; step++) {
      const x = step / 120;
      const amplitude = 0.08 + index * 0.04;
      points.push(point(x - 0.5, Math.sin(x * Math.PI * 2 + index) * amplitude + (index - 1) * 0.16));
    }
    return { color, width: 0.006, points };
  });
  return drawing(strokes);
}

export function burst(colors: string[]): DrawingData {
  const strokes = colors.map((color, index) => {
    const angle = (index / colors.length) * Math.PI * 2;
    return {
      color,
      width: 0.008,
      points: [point(Math.cos(angle) * 0.08, Math.sin(angle) * 0.08), point(Math.cos(angle) * 0.42, Math.sin(angle) * 0.42)],
    };
  });
  return drawing(strokes);
}

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

/**
 * y is scaled by the aspect ratio, or a circle would come out as an oval — which also means
 * a round shape may not exceed MAX_RADIUS, or it would be clipped flat top and bottom.
 */
function point(x: number, y: number): Point {
  return { x: clamp(0.5 + x), y: clamp(0.5 + y * ASPECT_RATIO) };
}

/** 0.5 of the height, expressed in fractions of the width. */
const MAX_RADIUS = 0.5 / ASPECT_RATIO;

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function spiral(color: string): DrawingData {
  const points: Point[] = [];
  for (let step = 0; step <= 240; step++) {
    const angle = (step / 240) * Math.PI * 8;
    const radius = 0.02 + (step / 240) * (MAX_RADIUS - 0.04);
    points.push(point(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  return drawing([{ color, width: 0.004, points }]);
}

export function waves(colors: string[]): DrawingData {
  const strokes = colors.map((color, index) => {
    const points: Point[] = [];
    for (let step = 0; step <= 120; step++) {
      const x = step / 120;
      const amplitude = 0.06 + index * 0.03;
      points.push(point(x - 0.5, Math.sin(x * Math.PI * 2 + index) * amplitude + (index - 1) * 0.13));
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
      points: [
        point(Math.cos(angle) * 0.06, Math.sin(angle) * 0.06),
        point(Math.cos(angle) * (MAX_RADIUS - 0.02), Math.sin(angle) * (MAX_RADIUS - 0.02)),
      ],
    };
  });
  return drawing(strokes);
}

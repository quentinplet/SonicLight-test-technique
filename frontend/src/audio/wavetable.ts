import type { Stroke } from "@/types/drawing";

/** Samples taken across the stroke to form one cycle. */
const CYCLE = 128;
/** Harmonics kept. Beyond this a hand-drawn shape brings noise, not brightness. */
const HARMONICS = 32;

/**
 * A waveform as the Web Audio API wants it: two arrays of Fourier coefficients, index 0
 * being the DC term it ignores.
 */
export interface Harmonics {
  real: Float32Array;
  imag: Float32Array;
}

/**
 * The stroke read as one cycle of a waveform: its y, resampled over its own x extent and
 * centred, then turned into harmonics. A flat line is a sine, a jagged one is bright.
 */
export function harmonicsFrom(stroke: Stroke): Harmonics {
  const cycle = resample(stroke);
  const real = new Float32Array(HARMONICS + 1);
  const imag = new Float32Array(HARMONICS + 1);

  for (let k = 1; k <= HARMONICS; k += 1) {
    let cosine = 0;
    let sine = 0;
    for (let n = 0; n < CYCLE; n += 1) {
      const angle = (2 * Math.PI * k * n) / CYCLE;
      cosine += cycle[n]! * Math.cos(angle);
      sine += cycle[n]! * Math.sin(angle);
    }
    real[k] = (2 / CYCLE) * cosine;
    imag[k] = (-2 / CYCLE) * sine;
  }

  return { real, imag };
}

/** The stroke's y over CYCLE even steps of its x extent, centred on zero. */
function resample(stroke: Stroke): number[] {
  const first = stroke.points[0]!;
  const last = stroke.points[stroke.points.length - 1]!;
  const from = Math.min(first.x, last.x);
  const span = Math.abs(last.x - first.x) || 1;

  const cycle: number[] = [];
  for (let n = 0; n < CYCLE; n += 1) {
    const x = from + (n / CYCLE) * span;
    // Up is positive, and y is normalised, so the wave already sits in [-1, 1].
    cycle.push(1 - 2 * yAt(stroke, x));
  }

  const mean = cycle.reduce((total, value) => total + value, 0) / CYCLE;
  return cycle.map((value) => value - mean);
}

/** Linear interpolation between the two points straddling x, in drawing order. */
function yAt(stroke: Stroke, x: number): number {
  const points = stroke.points;
  for (let i = 1; i < points.length; i += 1) {
    const before = points[i - 1]!;
    const after = points[i]!;
    const width = after.x - before.x;
    if (width === 0) continue;
    const ratio = (x - before.x) / width;
    if (ratio >= 0 && ratio <= 1) return before.y + ratio * (after.y - before.y);
  }
  return points[0]!.y;
}

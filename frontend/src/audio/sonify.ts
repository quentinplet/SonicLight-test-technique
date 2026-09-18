import { harmonicsFrom, type Harmonics } from "@/audio/wavetable";
import type { DrawingData } from "@/types/drawing";

/** One pass over the drawing, in seconds. */
export const DURATION = 8;
/** A vertical stroke spans no x at all, so every voice lasts at least this. */
const MIN_SECONDS = 0.5;

/** Minor pentatonic: no adjacent semitones, so any combination stays consonant. */
const SCALE = [0, 3, 5, 7, 10];
const ROOT = 110; // A2
const OCTAVES = 4;

/**
 * A stroke played as one voice. Its shape is its timbre, so no colour table is left: the
 * drawing itself is the waveform.
 */
export interface Note {
  /** Seconds from the start of the pass. */
  at: number;
  duration: number;
  frequency: number;
  gain: number;
  wave: Harmonics;
}

/** Geometry to music, and nothing else: no audio API is reachable from here. */
export function sonify(data: DrawingData): Note[] {
  return data.strokes.map((stroke) => {
    const first = stroke.points[0]!;
    const last = stroke.points[stroke.points.length - 1]!;
    const middle =
      stroke.points.reduce((total, point) => total + point.y, 0) / stroke.points.length;

    return {
      at: Math.min(first.x, last.x) * DURATION,
      duration: Math.max(MIN_SECONDS, Math.abs(last.x - first.x) * DURATION),
      // Pitch comes from where the stroke sits, its shape having become the timbre.
      frequency: frequencyOf(middle),
      gain: gainFrom(stroke.width),
      wave: harmonicsFrom(stroke),
    };
  });
}

/** Inverted — up is high — and quantised onto the scale. */
function frequencyOf(y: number): number {
  const degrees = SCALE.length * OCTAVES;
  const degree = Math.round((1 - y) * (degrees - 1));
  const semitones = SCALE[degree % SCALE.length]! + 12 * Math.floor(degree / SCALE.length);
  return ROOT * 2 ** (semitones / 12);
}

function gainFrom(width: number): number {
  return 0.04 + Math.min(width / 0.012, 1) * 0.06;
}

import type { DrawingData } from "@/types/drawing";

/** One pass over the drawing, in seconds. */
export const DURATION = 8;
/** The x axis is cut into this many steps. */
export const STEPS = 64;
/** Onsets per step: a dense drawing would otherwise clip the output. */
const MAX_VOICES = 4;
const NOTE_SECONDS = 0.25;

/** Minor pentatonic: no adjacent semitones, so any combination stays consonant. */
const SCALE = [0, 3, 5, 7, 10];
const ROOT = 220; // A3
const OCTAVES = 3;

/** Named as a sound, not as a waveform: a sample-based engine has no oscillator to name. */
export type Timbre = "pure" | "soft" | "hollow" | "bright";

/** One colour, one voice — which is why the palette is closed. */
const TIMBRES: Record<string, Timbre> = {
  "#18181b": "pure", // ink
  "#e11d48": "bright", // red
  "#a16207": "hollow", // yellow
  "#15803d": "soft", // green
  "#7c3aed": "pure", // violet
};

export interface Note {
  frequency: number;
  duration: number;
  gain: number;
  timbre: Timbre;
}

/** Notes starting at each step, indexed by step. */
export type Score = Note[][];

/** Geometry to music, and nothing else: no audio API is reachable from here. */
export function sonify(data: DrawingData): Score {
  const score: Score = Array.from({ length: STEPS }, () => []);

  for (const stroke of data.strokes) {
    const timbre = TIMBRES[stroke.color] ?? "pure";
    const gain = gainFrom(stroke.width);
    let previous = -1;

    for (const point of stroke.points) {
      const step = Math.min(STEPS - 1, Math.floor(point.x * STEPS));
      // A stroke crosses a step with many points and plays it once.
      if (step === previous) continue;
      previous = step;

      const onsets = score[step]!;
      if (onsets.length >= MAX_VOICES) continue;
      onsets.push({ frequency: frequencyOf(point.y), duration: NOTE_SECONDS, gain, timbre });
    }
  }

  return score;
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

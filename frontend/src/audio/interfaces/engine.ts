import type { Note } from "@/audio/sonify";

/**
 * What the transport needs from whatever makes the sound, and nothing more. Replacing the
 * raw Web Audio pass with Tone.js, samples, an AudioWorklet, RNBO or Faust means writing a
 * second implementation of this interface — not touching the mapping, the transport or a view.
 */
export interface AudioEngine {
  /** Called from a user gesture: a context built anywhere else starts suspended. */
  start(): Promise<void>;
  /** Seconds on the engine's own clock, which the transport schedules against. */
  now(): number;
  play(note: Note, at: number): void;
  /** Silence what is scheduled; the engine stays usable. */
  stop(): void;
  dispose(): void;
}

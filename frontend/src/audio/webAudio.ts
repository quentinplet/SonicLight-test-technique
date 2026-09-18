import type { AudioEngine } from "@/audio/interfaces/engine";
import type { Note, Timbre } from "@/audio/sonify";

/** Seconds of tail: stopping an oscillator dead produces an audible click. */
const RELEASE = 0.12;
const MASTER_GAIN = 0.5;
/** exponentialRampToValueAtTime throws on 0. */
const SILENCE = 0.0001;

const WAVES: Record<Timbre, OscillatorType> = {
  pure: "sine",
  soft: "triangle",
  hollow: "square",
  bright: "sawtooth",
};

/** The first implementation of the port: the raw Web Audio API, no library. */
export class WebAudioEngine implements AudioEngine {
  #context: AudioContext | null = null;
  #master: GainNode | null = null;

  async start(): Promise<void> {
    this.#context ??= new AudioContext();
    if (this.#context.state === "suspended") await this.#context.resume();

    this.#master = this.#context.createGain();
    this.#master.gain.value = MASTER_GAIN;
    this.#master.connect(this.#context.destination);
  }

  now(): number {
    return this.#context?.currentTime ?? 0;
  }

  play(note: Note, at: number): void {
    const context = this.#context;
    const master = this.#master;
    if (!context || !master) return;

    const oscillator = context.createOscillator();
    oscillator.type = WAVES[note.timbre];
    oscillator.frequency.value = note.frequency;

    const envelope = context.createGain();
    const until = at + note.duration + RELEASE;
    envelope.gain.setValueAtTime(SILENCE, at);
    envelope.gain.exponentialRampToValueAtTime(note.gain, at + 0.01);
    envelope.gain.exponentialRampToValueAtTime(SILENCE, until);

    oscillator.connect(envelope).connect(master);
    oscillator.start(at);
    oscillator.stop(until);
    // An oscillator is single use; without this, every pass leaves its nodes behind.
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }

  stop(): void {
    // Dropping the master silences the notes already scheduled ahead of the stop.
    this.#master?.disconnect();
    this.#master = null;
  }

  dispose(): void {
    this.stop();
    void this.#context?.close();
    this.#context = null;
  }
}

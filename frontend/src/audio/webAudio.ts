import type { AudioEngine } from "@/audio/interfaces/engine";
import type { Note } from "@/audio/sonify";

/** Seconds of tail: stopping an oscillator dead produces an audible click. */
const RELEASE = 0.12;
const MASTER_GAIN = 0.6;
/** exponentialRampToValueAtTime throws on 0. */
const SILENCE = 0.0001;

const DELAY_SECONDS = 0.25;
const DELAY_FEEDBACK = 0.6;
const DELAY_MIX = 0.3;
const REVERB_SECONDS = 1.6;
const REVERB_MIX = 0.7;

/** The first implementation of the port: the raw Web Audio API, no library. */
export class WebAudioEngine implements AudioEngine {
  #context: AudioContext | null = null;
  /** Where every voice lands, upstream of the effects. */
  #input: GainNode | null = null;
  /** Every node of the bus, so stop() takes the whole thing down. */
  #bus: AudioNode[] = [];

  async start(): Promise<void> {
    // Safari only, and set before the context exists. iOS plays Web Audio in its "ambient"
    // category, which the ring/silent switch mutes outright; "playback" is the category
    // that ignores it. The price is that it pauses whatever else the phone was playing.
    if (navigator.audioSession) navigator.audioSession.type = "playback";

    const context = (this.#context ??= new AudioContext());
    if (context.state !== "running") await context.resume();

    const input = context.createGain();
    const master = context.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(context.destination);

    const delay = context.createDelay(1);
    delay.delayTime.value = DELAY_SECONDS;
    const feedback = context.createGain();
    feedback.gain.value = DELAY_FEEDBACK;
    delay.connect(feedback).connect(delay);
    const delayMix = context.createGain();
    delayMix.gain.value = DELAY_MIX;

    const reverb = context.createConvolver();
    reverb.buffer = impulse(context);
    const reverbMix = context.createGain();
    reverbMix.gain.value = REVERB_MIX;

    // Dry and both sends meet again in the master, which is the last gain before the output:
    // one fader for everything. In series, a note would lose its attack to the effects.
    input.connect(master);
    input.connect(delay).connect(delayMix).connect(master);
    input.connect(reverb).connect(reverbMix).connect(master);

    this.#input = input;
    this.#bus = [input, delay, feedback, delayMix, reverb, reverbMix, master];
  }

  now(): number {
    return this.#context?.currentTime ?? 0;
  }

  play(note: Note, at: number): void {
    const context = this.#context;
    const input = this.#input;
    if (!context || !input) return;

    const oscillator = context.createOscillator();
    // The stroke's own shape, as harmonics. createPeriodicWave band-limits it, which a
    // looped buffer would not: a hand-drawn corner would alias in the top octave.
    oscillator.setPeriodicWave(context.createPeriodicWave(note.wave.real, note.wave.imag));
    oscillator.frequency.value = note.frequency;

    const envelope = context.createGain();
    const until = at + note.duration + RELEASE;
    envelope.gain.setValueAtTime(SILENCE, at);
    envelope.gain.exponentialRampToValueAtTime(note.gain, at + 0.01);
    envelope.gain.exponentialRampToValueAtTime(SILENCE, until);

    oscillator.connect(envelope).connect(input);
    oscillator.start(at);
    oscillator.stop(until);
    // An oscillator is single use; without this, every pass leaves its nodes behind.
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }

  stop(): void {
    // The whole bus goes, tails included: a stop has to be silent immediately.
    for (const node of this.#bus) node.disconnect();
    this.#bus = [];
    this.#input = null;
  }

  dispose(): void {
    this.stop();
    void this.#context?.close();
    this.#context = null;
  }
}

/** Decaying noise as an impulse response: a plausible room, and no file to ship. */
function impulse(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * REVERB_SECONDS);
  const buffer = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
  }

  return buffer;
}

import { onBeforeUnmount, ref, type Ref } from "vue";
import type { AudioEngine } from "@/audio/interfaces/engine";
import { DURATION, sonify, STEPS } from "@/audio/sonify";
import { WebAudioEngine } from "@/audio/webAudio";
import type { DrawingData } from "@/types/drawing";

const STEP_SECONDS = DURATION / STEPS;

export function useSonification(engine: AudioEngine = new WebAudioEngine()): {
  playing: Ref<boolean>;
  /** Playhead in [0, 1], or null when stopped. Drives the line on the canvas. */
  head: Ref<number | null>;
  toggle: (source: () => DrawingData) => void;
  stop: () => void;
} {
  const playing = ref(false);
  const head = ref<number | null>(null);

  let startedAt = 0;
  let loop: number | undefined;
  let frame: number | undefined;

  /**
   * Web Audio schedules dated events itself, so a whole eight-second pass is handed over at
   * once — no sliding horizon. Each pass re-reads the drawing, which is what makes this an
   * instrument rather than a recording.
   */
  function pass(source: () => DrawingData): void {
    startedAt = engine.now() + 0.05;
    sonify(source()).forEach((onsets, step) => {
      for (const note of onsets) engine.play(note, startedAt + step * STEP_SECONDS);
    });
    loop = window.setTimeout(() => pass(source), DURATION * 1000);
  }

  function followHead(): void {
    head.value = Math.min(1, Math.max(0, (engine.now() - startedAt) / DURATION));
    frame = requestAnimationFrame(followHead);
  }

  async function start(source: () => DrawingData): Promise<void> {
    playing.value = true;
    await engine.start();
    pass(source);
    frame = requestAnimationFrame(followHead);
  }

  function stop(): void {
    window.clearTimeout(loop);
    if (frame !== undefined) cancelAnimationFrame(frame);
    loop = undefined;
    frame = undefined;
    engine.stop();
    playing.value = false;
    head.value = null;
  }

  function toggle(source: () => DrawingData): void {
    if (playing.value) stop();
    else void start(source);
  }

  onBeforeUnmount(() => {
    stop();
    engine.dispose();
  });

  return { playing, head, toggle, stop };
}

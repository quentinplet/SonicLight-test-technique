/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Inlined at build time, never read at runtime: changing it requires a rebuild.
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * Audio Session API — WebKit only, and not in lib.dom. iOS routes Web Audio through its
 * "ambient" category, which the ring/silent switch mutes; declaring a type is the only
 * standards-track way to ask for another one. Optional, so every use needs a guard.
 */
interface AudioSession {
  type: "auto" | "playback" | "transient" | "transient-solo" | "ambient" | "play-and-record"
}

interface Navigator {
  readonly audioSession?: AudioSession
}

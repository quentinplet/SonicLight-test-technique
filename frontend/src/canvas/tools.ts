/**
 * What a drawing is made with: the fixed canvas shape, the closed palette, the widths, and
 * the tool the user is holding. Data and types only — no Vue, like the rest of canvas/.
 */
/** Fixed shape, so every drawing shares one aspect ratio. */
export const ASPECT_RATIO = 1.5;
export const BACKGROUND = "#ffffff";

export interface Tool {
  color: string;
  width: number;
  /**
   * The palette paints, the eraser removes whole strokes. It deletes data rather than
   * painting the background over it: a white stroke would still be a stroke, and would
   * still sound — erasing has to reach the audio as well as the screen.
   */
  mode: "draw" | "erase";
}

/**
 * Closed palette, named for screen readers, darkened to clear 3:1 on white. It is also the
 * instrument list: one colour, one timbre (audio/sonify.ts), so a new colour has to sound
 * like something.
 */
export const PALETTE = [
  { key: "palette.ink", hex: "#18181b" },
  { key: "palette.red", hex: "#e11d48" },
  { key: "palette.yellow", hex: "#a16207" },
  { key: "palette.green", hex: "#15803d" },
  { key: "palette.violet", hex: "#7c3aed" },
] as const;

/**
 * Widths as a fraction of the canvas width, so they hold at any size.
 * The glyph is the only visual cue a native <option> can carry: it holds text, never markup.
 */
export const WIDTHS = [
  { key: "width.thin", glyph: "•", value: 0.002 },
  { key: "width.medium", glyph: "●", value: 0.005 },
  { key: "width.thick", glyph: "⬤", value: 0.012 },
] as const;

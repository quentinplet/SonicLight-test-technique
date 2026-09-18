/**
 * The drawing format. Copy of backend/src/types/drawing.ts, which is canonical.
 * A change there is a change here, in the same commit.
 *
 * A drawing is geometry, not an image: that is what lets one drawing render in the editor,
 * in a replay and in a thumbnail, and what will make sonification nearly free.
 *
 * Declared with `type`, not `interface`: only a type alias gets TypeScript's implicit index
 * signature, which Prisma requires to store the object in a Json column.
 */

/** A point in NORMALISED coordinates, [0, 1] relative to the canvas box. Never pixels. */
export type Point = {
  x: number;
  y: number;
};

export type Stroke = {
  /** Hex colour, e.g. "#e11d48". */
  color: string;
  /** Normalised thickness: a fraction of the canvas WIDTH — thickness is a scalar. */
  width: number;
  points: Point[];
};

export type DrawingData = {
  /** Format version, so old drawings stay readable when the format changes. */
  version: 1;
  /** Width / height of the canvas it was drawn on, so a replay keeps its proportions. */
  aspectRatio: number;
  background: string;
  strokes: Stroke[];
};

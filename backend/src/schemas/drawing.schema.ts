import { z } from "zod";
// Annotated with the shared type: the schema and DrawingData cannot drift apart.
import type { DrawingData } from "../types/drawing.js";

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

const PointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const StrokeSchema = z.object({
  color: z.string().regex(HEX_COLOUR, "Colour must be a hex value like #e11d48"),
  width: z.number().positive().max(0.5),
  points: z.array(PointSchema).min(1).max(5_000),
});

/**
 * The bounds are not decoration: without them a client can post a 200 MB jsonb row.
 * 1 000 strokes of 5 000 points is far beyond real use while staying a hard ceiling.
 */
export const DrawingDataSchema: z.ZodType<DrawingData> = z.object({
  version: z.literal(1),
  aspectRatio: z.number().positive().max(10),
  background: z.string().regex(HEX_COLOUR, "Background must be a hex value like #ffffff"),
  strokes: z.array(StrokeSchema).min(1).max(1_000),
});

export const SaveDrawingSchema = z.object({
  // Optional: the service falls back to the owner's user name.
  title: z.string().trim().max(80).optional(),
  data: DrawingDataSchema,
});

export type SaveDrawingInput = z.infer<typeof SaveDrawingSchema>;

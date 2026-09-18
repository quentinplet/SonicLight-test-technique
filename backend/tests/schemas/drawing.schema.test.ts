import { describe, expect, it } from "vitest";
import { DrawingDataSchema, SaveDrawingSchema } from "../../src/schemas/drawing.schema.js";
import type { DrawingData } from "../../src/types/drawing.js";

const valid: DrawingData = {
  version: 1,
  aspectRatio: 1.5,
  background: "#ffffff",
  strokes: [{ color: "#e11d48", width: 0.004, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }],
};

function withStroke(stroke: Partial<DrawingData["strokes"][number]>) {
  return { ...valid, strokes: [{ ...valid.strokes[0]!, ...stroke }] };
}

describe("DrawingDataSchema", () => {
  it("accepts a drawing in normalised coordinates", () => {
    expect(DrawingDataSchema.parse(valid)).toEqual(valid);
  });

  it("rejects coordinates outside [0, 1] — pixels must never reach the server", () => {
    expect(DrawingDataSchema.safeParse(withStroke({ points: [{ x: 640, y: 480 }] })).success).toBe(false);
    expect(DrawingDataSchema.safeParse(withStroke({ points: [{ x: -0.1, y: 0.5 }] })).success).toBe(false);
  });

  it("rejects an unknown format version", () => {
    expect(DrawingDataSchema.safeParse({ ...valid, version: 2 }).success).toBe(false);
  });

  it("rejects a colour that is not a hex value", () => {
    expect(DrawingDataSchema.safeParse(withStroke({ color: "red" })).success).toBe(false);
    expect(DrawingDataSchema.safeParse({ ...valid, background: "white" }).success).toBe(false);
  });

  it("rejects an absurd stroke width", () => {
    expect(DrawingDataSchema.safeParse(withStroke({ width: 0 })).success).toBe(false);
    expect(DrawingDataSchema.safeParse(withStroke({ width: 0.6 })).success).toBe(false);
  });

  it("caps the payload: 5 000 points per stroke, 1 000 strokes", () => {
    const point = { x: 0.5, y: 0.5 };
    expect(DrawingDataSchema.safeParse(withStroke({ points: Array(5_001).fill(point) })).success).toBe(false);
    const strokes = Array(1_001).fill(valid.strokes[0]);
    expect(DrawingDataSchema.safeParse({ ...valid, strokes }).success).toBe(false);
  });

  it("accepts a drawing with no stroke: that is how a saved drawing is wiped", () => {
    expect(DrawingDataSchema.safeParse({ ...valid, strokes: [] }).success).toBe(true);
  });
});

describe("SaveDrawingSchema", () => {
  it("accepts a drawing without a title", () => {
    expect(SaveDrawingSchema.parse({ data: valid }).title).toBeUndefined();
  });

  it("trims the title and rejects one longer than the column", () => {
    expect(SaveDrawingSchema.parse({ title: "  Sunrise ", data: valid }).title).toBe("Sunrise");
    expect(SaveDrawingSchema.safeParse({ title: "x".repeat(81), data: valid }).success).toBe(false);
  });
});

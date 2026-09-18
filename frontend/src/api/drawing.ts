import type { DrawingData } from "@/types/drawing";
import { request } from "./http";

export interface Drawing {
  title: string;
  data: DrawingData;
  createdAt: string;
  updatedAt: string;
}

export interface SaveDrawingInput {
  /** Optional: the server falls back to the owner's user name. */
  title?: string;
  data: DrawingData;
}

/** Singular and without an id: the token names the drawing. 404 while there is none. */
export function getDrawing(): Promise<Drawing> {
  return request<Drawing>("/api/drawing");
}

export function saveDrawing(input: SaveDrawingInput): Promise<Drawing> {
  return request<Drawing>("/api/drawing", { method: "PUT", body: JSON.stringify(input) });
}

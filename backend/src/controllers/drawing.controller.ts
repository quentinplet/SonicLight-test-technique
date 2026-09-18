import type { Request, Response } from "express";
import { parseBody } from "../lib/validation.js";
import { SaveDrawingSchema } from "../schemas/drawing.schema.js";
import * as drawingService from "../services/drawing.service.js";

// requireAuth runs first on every route here, so req.user is set.
export async function getDrawing(req: Request, res: Response): Promise<void> {
  res.json(await drawingService.getDrawing(req.user!.id));
}

export async function saveDrawing(req: Request, res: Response): Promise<void> {
  const input = parseBody(SaveDrawingSchema, req.body);
  res.json(await drawingService.saveDrawing(req.user!.id, input));
}

export async function removeDrawing(req: Request, res: Response): Promise<void> {
  await drawingService.removeDrawing(req.user!.id);
  res.status(204).end();
}

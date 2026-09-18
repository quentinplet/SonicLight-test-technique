import type { Request, Response } from "express";
import { parseParams } from "../lib/validation.js";
import { DrawingIdSchema } from "../schemas/drawing.schema.js";
import * as adminService from "../services/admin.service.js";

export async function listDrawings(_req: Request, res: Response): Promise<void> {
  res.json(await adminService.listAllForAdmin());
}

export async function getDrawing(req: Request, res: Response): Promise<void> {
  const { id } = parseParams(DrawingIdSchema, req.params);
  res.json(await adminService.getByIdForAdmin(id));
}

export async function removeDrawing(req: Request, res: Response): Promise<void> {
  const { id } = parseParams(DrawingIdSchema, req.params);
  await adminService.removeForAdmin(id);
  res.status(204).end();
}

import { Router } from "express";
import * as drawingController from "../controllers/drawing.controller.js";
import { requireAuth } from "../middleware/auth.js";

// Singular and without an id: a user has at most one drawing, and the token names it.
// PUT, not POST: saving twice leaves the same state.
export const drawingRouter = Router();

drawingRouter.use(requireAuth);
drawingRouter.get("/", drawingController.getDrawing);
drawingRouter.put("/", drawingController.saveDrawing);
drawingRouter.delete("/", drawingController.removeDrawing);

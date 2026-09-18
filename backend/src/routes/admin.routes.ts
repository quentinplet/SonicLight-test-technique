import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

// requireAdmin runs after requireAuth: no token is a 401, a USER token is a 403.
export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);
adminRouter.get("/drawings", adminController.listDrawings);
adminRouter.get("/drawings/:id", adminController.getDrawing);
adminRouter.delete("/drawings/:id", adminController.removeDrawing);

import type { Request, Response } from "express";
import { parseBody } from "../lib/validation.js";
import { LoginSchema, RegisterSchema } from "../schemas/auth.schema.js";
import * as authService from "../services/auth.service.js";

export async function register(req: Request, res: Response): Promise<void> {
  const input = parseBody(RegisterSchema, req.body);
  res.status(201).json(await authService.register(input));
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = parseBody(LoginSchema, req.body);
  res.json(await authService.login(input));
}

export async function me(req: Request, res: Response): Promise<void> {
  // requireAuth runs first on this route, so req.user is set.
  res.json(await authService.getMe(req.user!.id));
}

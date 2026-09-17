import type { Request, Response } from "express";
import { parseBody } from "../lib/validation.js";
import { CredentialsSchema } from "../schemas/auth.schema.js";
import * as authService from "../services/auth.service.js";

export async function register(req: Request, res: Response): Promise<void> {
  const credentials = parseBody(CredentialsSchema, req.body);
  res.status(201).json(await authService.register(credentials));
}

export async function login(req: Request, res: Response): Promise<void> {
  const credentials = parseBody(CredentialsSchema, req.body);
  res.json(await authService.login(credentials));
}

export async function me(req: Request, res: Response): Promise<void> {
  // requireAuth runs first on this route, so req.user is set.
  res.json(await authService.getMe(req.user!.id));
}

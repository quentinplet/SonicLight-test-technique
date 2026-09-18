import { verifyToken } from "../../src/lib/jwt.js";
import { prisma } from "../../src/lib/prisma.js";
import { login, register } from "../../src/services/auth.service.js";
import type { DrawingData } from "../../src/types/drawing.js";

/** A minimal valid drawing; pass a colour to tell two drawings apart. */
export function drawingData(color = "#e11d48"): DrawingData {
  return {
    version: 1,
    aspectRatio: 1.5,
    background: "#ffffff",
    strokes: [
      {
        color,
        width: 0.004,
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.9, y: 0.9 },
        ],
      },
    ],
  };
}

/** Registers a user and returns their id, the value services take as owner. */
export async function createUser(userName: string): Promise<string> {
  const { token } = await register({ userName, password: "correct-horse" });
  const user = verifyToken(token);
  if (!user) throw new Error("expected a valid token");
  return user.id;
}

/**
 * An admin, with a token that says so: the role travels in the token, so promoting the
 * account in the database is not enough — a token issued before the change still says USER.
 */
export async function createAdminToken(userName: string): Promise<string> {
  const password = "correct-horse";
  await register({ userName, password });
  await prisma.user.update({ where: { userName }, data: { role: "ADMIN" } });
  return (await login({ userName, password })).token;
}

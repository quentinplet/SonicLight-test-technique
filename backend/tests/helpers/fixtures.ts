import { verifyToken } from "../../src/lib/jwt.js";
import { register } from "../../src/services/auth.service.js";
import type { DrawingData } from "../../src/types/drawing.js";

/** A minimal valid drawing; pass a colour to tell two drawings apart. */
export function drawingData(color = "#e11d48"): DrawingData {
  return {
    version: 1,
    aspectRatio: 1.5,
    background: "#ffffff",
    strokes: [{ color, width: 0.004, points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }] }],
  };
}

/** Registers a user and returns their id, the value services take as owner. */
export async function createUser(userName: string): Promise<string> {
  const { token } = await register({ userName, password: "correct-horse" });
  const user = verifyToken(token);
  if (!user) throw new Error("expected a valid token");
  return user.id;
}

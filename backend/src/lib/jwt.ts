import jwt from "jsonwebtoken";
import { z } from "zod";
import { Role } from "../generated/prisma/enums.js";
import { env } from "./env.js";

// A fixed lifetime, not an env variable: nothing in the project needs to tune it.
// No refresh token, so this is also the longest a stolen token stays usable.
const TOKEN_LIFETIME = "7d";

export interface AuthUser {
  id: string;
  role: Role;
}

// The verified payload is still parsed: a valid signature proves who issued the token,
// not that its content has the shape this code expects.
const PayloadSchema = z.object({
  sub: z.uuid(),
  role: z.enum(Role),
});

export function signToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    algorithm: "HS256",
    subject: user.id,
    expiresIn: TOKEN_LIFETIME,
  });
}

/** Returns the user a token was issued for, or null if it is forged, expired or malformed. */
export function verifyToken(token: string): AuthUser | null {
  try {
    // Pinning the algorithm refuses "alg: none" and any algorithm swap.
    const payload = PayloadSchema.safeParse(jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }));
    return payload.success ? { id: payload.data.sub, role: payload.data.role } : null;
  } catch {
    return null;
  }
}

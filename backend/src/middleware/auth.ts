import type { RequestHandler } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";
import { type AuthUser, verifyToken } from "../lib/jwt.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth, from the verified token — never from the request body. */
      user?: AuthUser;
    }
  }
}

const unauthorized = () => new UnauthorizedError("auth.unauthorized", "Missing or invalid token.");

export const requireAuth: RequestHandler = (req, _res, next) => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
  const user = scheme === "Bearer" && token ? verifyToken(token) : null;
  if (!user) return next(unauthorized());

  req.user = user;
  next();
};

// Mounted after requireAuth. The only 403 in the project: an admin route's existence is no secret.
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "ADMIN")
    return next(new ForbiddenError("auth.forbidden", "Admin role required."));
  next();
};

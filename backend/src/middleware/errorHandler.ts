import type { ErrorRequestHandler, RequestHandler } from "express";
import {
  AppError,
  BadRequestError,
  NotFoundError,
} from "../errors/app-error.js";

/** The one error shape on the wire. `code` is stable; `message` is for the developer. */
export interface ApiError {
  code: string;
  message: string;
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError("route.notFound", "Route not found."));
};

// Registered last. Express 5 forwards rejected promises from async handlers here natively.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const error = isBodyParseError(err)
    ? new BadRequestError("request.invalidJson", "Malformed JSON body.")
    : err;

  // Expected errors carry their own status and code: nothing to log, nothing to hide.
  if (error instanceof AppError) {
    res
      .status(error.status)
      .json({ code: error.code, message: error.message } satisfies ApiError);
    return;
  }

  // Anything else is a bug: log the details, reveal none of them.
  console.error(error);
  res
    .status(500)
    .json({
      code: "internal",
      message: "Internal server error.",
    } satisfies ApiError);
};

function isBodyParseError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    err.type === "entity.parse.failed"
  );
}

import type { ErrorRequestHandler, RequestHandler } from "express";

/** The one error shape on the wire. `code` is stable; `message` is for the developer. */
export interface ApiError {
  code: string;
  message: string;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ code: "route.notFound", message: "Route not found." } satisfies ApiError);
};

// Registered last. Express 5 forwards rejected promises from async handlers here natively.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Thrown by express.json() on a malformed body.
  if (isBodyParseError(err)) {
    res.status(400).json({ code: "request.invalidJson", message: "Malformed JSON body." } satisfies ApiError);
    return;
  }

  console.error(err);
  res.status(500).json({ code: "internal", message: "Internal server error." } satisfies ApiError);
};

function isBodyParseError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "type" in err && err.type === "entity.parse.failed";
}

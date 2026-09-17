import cors from "cors";
import express, { type Express } from "express";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.routes.js";
import { healthRouter } from "./routes/health.routes.js";

// Building the app is separate from listening, so tests can mount it on an ephemeral port.
export function createApp(clientOrigins: string[]): Express {
  const app = express();

  // Explicit list, never "*", and no `credentials`: the token travels in a header, not a cookie.
  app.use(cors({ origin: clientOrigins }));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

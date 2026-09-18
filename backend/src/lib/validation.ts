import { z } from "zod";
import { BadRequestError } from "../errors/app-error.js";

/**
 * Parses a request body, or throws a 400 whose message lists every failing rule, e.g.
 * "User name must be at least 3 characters. Password is required."
 * Nothing unvalidated reaches a service.
 */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues.map((issue) => `${issue.message}.`).join(" ");
    throw new BadRequestError("request.invalidBody", message);
  }
  return result.data;
}

/** Same, for route parameters: an id that is not a UUID never reaches a service. */
export function parseParams<T>(schema: z.ZodType<T>, params: unknown): T {
  const result = schema.safeParse(params);
  if (!result.success) throw new BadRequestError("request.invalidParams", "Invalid route parameter.");
  return result.data;
}

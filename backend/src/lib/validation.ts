import { z } from "zod";
import { BadRequestError } from "../errors/app-error.js";

/** Parses a request body, or throws a 400 listing the failing fields. Nothing unvalidated reaches a service. */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new BadRequestError("request.invalidBody", z.prettifyError(result.error));
  return result.data;
}

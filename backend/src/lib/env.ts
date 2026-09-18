import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  // HS256 is only as strong as its secret. Generate one with: openssl rand -base64 32
  JWT_SECRET: z.string().min(32, "must be at least 32 characters (openssl rand -base64 32)"),
  // Comma-separated list of exact origins allowed by CORS — never "*".
  CLIENT_ORIGINS: z
    .string()
    .min(1)
    .transform((value) => value.split(",").map((origin) => origin.trim()))
    .pipe(
      z.array(
        // A browser sends the bare origin: "https://x.dev/" would never match "https://x.dev".
        z
          .url()
          .refine((url) => new URL(url).origin === url, "must be a bare origin, no trailing slash"),
      ),
    ),
});

export type Env = z.infer<typeof EnvSchema>;

// Validated once at boot: a missing variable stops the process here, with its name,
// instead of surfacing later as an `undefined` deep inside a request.
function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:\n" + z.prettifyError(result.error));
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();

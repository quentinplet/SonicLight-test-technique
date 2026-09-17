import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env by itself. Node does it natively; the file is optional
// because CI and hosted environments provide real variables instead.
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the environment as is.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Read directly rather than through env(), which throws when the variable is absent —
    // and `prisma generate` in CI needs no database at all.
    url: process.env.DATABASE_URL ?? "",
  },
});

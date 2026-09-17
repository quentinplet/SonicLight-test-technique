import { defineConfig } from "vitest/config";

// Tests never read backend/.env: they get their own values, so they cannot touch the
// development database. A real environment (CI) can still override each one.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgresql://soniclight:soniclight@localhost:5433/soniclight_test",
      JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
      CLIENT_ORIGINS: "http://localhost:5173",
    },
  },
});

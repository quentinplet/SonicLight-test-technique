import { randomUUID } from "node:crypto";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signToken } from "../../src/lib/jwt.js";
import { startServer, type TestServer } from "../helpers/server.js";
import { requireAdmin, requireAuth } from "../../src/middleware/auth.js";
import { errorHandler } from "../../src/middleware/errorHandler.js";

let server: TestServer;

beforeAll(async () => {
  const app = express();
  app.get("/private", requireAuth, (req, res) => {
    res.json(req.user);
  });
  app.get("/admin", requireAuth, requireAdmin, (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  server = await startServer(app);
});

afterAll(() => server.close());

function get(path: string, authorization?: string): Promise<Response> {
  return fetch(`${server.url}${path}`, { headers: authorization ? { Authorization: authorization } : {} });
}

const userToken = signToken({ id: randomUUID(), role: "USER" });
const adminToken = signToken({ id: randomUUID(), role: "ADMIN" });

describe("requireAuth", () => {
  it("rejects a request without a token", async () => {
    const res = await get("/private");
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "auth.unauthorized" });
  });

  it("rejects a token not sent as a Bearer", async () => {
    expect((await get("/private", userToken)).status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    expect((await get("/private", "Bearer not-a-jwt")).status).toBe(401);
  });

  it("exposes the verified user to the handler", async () => {
    const res = await get("/private", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ role: "USER" });
  });
});

describe("requireAdmin", () => {
  it("refuses a USER with a 403", async () => {
    const res = await get("/admin", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "auth.forbidden" });
  });

  it("lets an ADMIN through", async () => {
    expect((await get("/admin", `Bearer ${adminToken}`)).status).toBe(200);
  });
});

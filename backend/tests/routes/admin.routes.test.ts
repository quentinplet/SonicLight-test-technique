import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { register } from "../../src/services/auth.service.js";
import { saveDrawing } from "../../src/services/drawing.service.js";
import { resetDatabase } from "../helpers/db.js";
import { createAdminToken, createUser, drawingData } from "../helpers/fixtures.js";
import { startServer, type TestServer } from "../helpers/server.js";

let server: TestServer;
let userToken: string;
let adminToken: string;
let aliceDrawingId: string;

beforeAll(async () => {
  server = await startServer(createApp(["http://localhost:5173"]));
});

beforeEach(async () => {
  await resetDatabase();

  const alice = await createUser("alice");
  await saveDrawing(alice, { title: "Sunrise", data: drawingData("#e11d48") });
  aliceDrawingId = (await prisma.drawing.findUniqueOrThrow({ where: { userId: alice } })).id;

  userToken = (await register({ userName: "bob", password: "correct-horse" })).token;
  adminToken = await createAdminToken("root");
});

afterAll(async () => {
  server.close();
  await prisma.$disconnect();
});

function call(method: string, path: string, token?: string): Promise<Response> {
  return fetch(`${server.url}/api/admin${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("admin routes are closed to everyone else", () => {
  const routes: [string, string][] = [
    ["GET", "/drawings"],
    ["GET", `/drawings/${randomUUID()}`],
    ["DELETE", `/drawings/${randomUUID()}`],
  ];

  it.each(routes)("answers 401 without a token: %s %s", async (method, path) => {
    const res = await call(method, path);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "auth.unauthorized" });
  });

  it.each(routes)("answers 403 for a USER: %s %s", async (method, path) => {
    const res = await call(method, path, userToken);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "auth.forbidden" });
  });
});

describe("as an admin", () => {
  it("lists every user's drawing with its author, and without the data", async () => {
    const res = await call("GET", "/drawings", adminToken);
    expect(res.status).toBe(200);

    const [summary, ...rest] = await res.json();
    expect(rest).toHaveLength(0);
    expect(summary).toMatchObject({ title: "Sunrise", userName: "alice" });
    expect(summary).not.toHaveProperty("data");
  });

  it("opens any drawing, data included", async () => {
    const res = await call("GET", `/drawings/${aliceDrawingId}`, adminToken);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ userName: "alice", data: drawingData("#e11d48") });
  });

  it("deletes any drawing, which no user route can do", async () => {
    expect((await call("DELETE", `/drawings/${aliceDrawingId}`, adminToken)).status).toBe(204);
    expect(await prisma.drawing.count()).toBe(0);
  });

  it("answers 404 for an unknown drawing and 400 for a malformed id", async () => {
    expect((await call("GET", `/drawings/${randomUUID()}`, adminToken)).status).toBe(404);
    expect((await call("DELETE", "/drawings/not-an-id", adminToken)).status).toBe(400);
  });
});

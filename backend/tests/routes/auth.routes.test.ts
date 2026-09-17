import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { resetDatabase } from "../helpers/db.js";
import { startServer, type TestServer } from "../helpers/server.js";

let server: TestServer;

beforeAll(async () => {
  server = await startServer(createApp(["http://localhost:5173"]));
});
beforeEach(resetDatabase);
afterAll(async () => {
  server.close();
  await prisma.$disconnect();
});

function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${server.url}/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("auth routes", () => {
  it("registers, then reads the current user with the returned token", async () => {
    const registered = await post("/register", { userName: "  Alice ", password: "correct-horse" });
    expect(registered.status).toBe(201);
    const { token } = await registered.json();

    const me = await fetch(`${server.url}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    expect(me.status).toBe(200);
    // Trimmed and lowercased by the schema.
    expect(await me.json()).toMatchObject({ userName: "alice", role: "USER" });
  });

  it("ignores a role sent in the registration body", async () => {
    const res = await post("/register", { userName: "mallory", password: "correct-horse", role: "ADMIN" });
    expect((await res.json()).user.role).toBe("USER");
  });

  it("answers an invalid body with a 400", async () => {
    const res = await post("/register", { userName: "a", password: "short" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "request.invalidBody" });
  });

  it("refuses a password longer than bcrypt can hash", async () => {
    const res = await post("/register", { userName: "alice", password: "x".repeat(73) });
    expect(res.status).toBe(400);
  });

  it("answers wrong credentials with a 401", async () => {
    await post("/register", { userName: "alice", password: "correct-horse" });
    const res = await post("/login", { userName: "alice", password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "auth.invalidCredentials" });
  });

  it("protects /me", async () => {
    expect((await fetch(`${server.url}/api/auth/me`)).status).toBe(401);
  });
});

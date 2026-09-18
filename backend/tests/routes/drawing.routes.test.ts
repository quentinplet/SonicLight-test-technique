import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { register } from "../../src/services/auth.service.js";
import { resetDatabase } from "../helpers/db.js";
import { drawingData } from "../helpers/fixtures.js";
import { startServer, type TestServer } from "../helpers/server.js";

let server: TestServer;
let aliceToken: string;
let bobToken: string;

beforeAll(async () => {
  server = await startServer(createApp(["http://localhost:5173"]));
});

beforeEach(async () => {
  await resetDatabase();
  aliceToken = (await register({ userName: "alice", password: "correct-horse" })).token;
  bobToken = (await register({ userName: "bob", password: "correct-horse" })).token;
});

afterAll(async () => {
  server.close();
  await prisma.$disconnect();
});

function call(method: string, token?: string, body?: unknown): Promise<Response> {
  return fetch(`${server.url}/api/drawing`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("drawing routes", () => {
  it("requires a token on every route", async () => {
    expect((await call("GET")).status).toBe(401);
    expect((await call("PUT", undefined, { data: drawingData() })).status).toBe(401);
    expect((await call("DELETE")).status).toBe(401);
  });

  it("saves a drawing, then reads it back", async () => {
    const data = drawingData();
    const saved = await call("PUT", aliceToken, { title: "Sunrise", data });
    expect(saved.status).toBe(200);

    const read = await call("GET", aliceToken);
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ title: "Sunrise", data });
  });

  it("answers 404 while the user has no drawing, including for someone else's", async () => {
    await call("PUT", aliceToken, { title: "Sunrise", data: drawingData() });

    const res = await call("GET", bobToken);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "drawing.notFound" });
  });

  it("refuses a drawing in pixel coordinates", async () => {
    const data = { ...drawingData(), strokes: [{ color: "#e11d48", width: 2, points: [{ x: 640, y: 480 }] }] };

    const res = await call("PUT", aliceToken, { data });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "request.invalidBody" });
  });

  it("deletes the drawing and answers 204", async () => {
    await call("PUT", aliceToken, { data: drawingData() });

    expect((await call("DELETE", aliceToken)).status).toBe(204);
    expect((await call("GET", aliceToken)).status).toBe(404);
  });
});

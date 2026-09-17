import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConflictError } from "../../src/errors/app-error.js";
import { startServer, type TestServer } from "../helpers/server.js";
import { errorHandler, notFoundHandler } from "../../src/middleware/errorHandler.js";

let server: TestServer;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  // No try/catch, no wrapper: Express 5 must forward the rejection on its own.
  app.get("/rejects", async () => {
    throw new Error("boom");
  });
  app.get("/conflict", async () => {
    throw new ConflictError("thing.taken", "Thing already taken.");
  });
  app.post("/echo", (req, res) => {
    res.json(req.body);
  });
  app.use(notFoundHandler);
  app.use(errorHandler);
  server = await startServer(app);
});

afterAll(() => server.close());

describe("errorHandler", () => {
  it("turns a rejected async handler into a 500 with the API error shape", async () => {
    const res = await fetch(`${server.url}/rejects`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ code: "internal", message: "Internal server error." });
  });

  it("answers an AppError with its own status, code and message", async () => {
    const res = await fetch(`${server.url}/conflict`);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ code: "thing.taken", message: "Thing already taken." });
  });

  it("answers a malformed JSON body with a 400", async () => {
    const res = await fetch(`${server.url}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "request.invalidJson" });
  });

  it("answers an unknown route with a 404", async () => {
    const res = await fetch(`${server.url}/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "route.notFound" });
  });
});

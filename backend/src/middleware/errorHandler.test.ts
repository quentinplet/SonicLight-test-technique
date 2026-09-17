import type { Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { errorHandler, notFoundHandler } from "./errorHandler.js";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  // No try/catch, no wrapper: Express 5 must forward the rejection on its own.
  app.get("/rejects", async () => {
    throw new Error("boom");
  });
  app.post("/echo", (req, res) => {
    res.json(req.body);
  });
  app.use(notFoundHandler);
  app.use(errorHandler);

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("expected a TCP address");
  baseUrl = `http://localhost:${address.port}`;
});

afterAll(() => {
  server.close();
});

describe("errorHandler", () => {
  it("turns a rejected async handler into a 500 with the API error shape", async () => {
    const res = await fetch(`${baseUrl}/rejects`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ code: "internal", message: "Internal server error." });
  });

  it("answers a malformed JSON body with a 400", async () => {
    const res = await fetch(`${baseUrl}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "request.invalidJson" });
  });

  it("answers an unknown route with a 404", async () => {
    const res = await fetch(`${baseUrl}/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "route.notFound" });
  });
});

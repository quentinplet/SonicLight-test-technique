import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { type AuthUser, signToken, verifyToken } from "../../src/lib/jwt.js";

const user: AuthUser = { id: randomUUID(), role: "USER" };
const secret = process.env.JWT_SECRET ?? "";

describe("jwt", () => {
  it("verifies a token it signed", () => {
    expect(verifyToken(signToken(user))).toEqual(user);
  });

  it("rejects a payload whose role was flipped to ADMIN without re-signing", () => {
    const [header, payload, signature] = signToken(user).split(".");
    const decoded = JSON.parse(Buffer.from(payload ?? "", "base64url").toString());
    const forged = Buffer.from(JSON.stringify({ ...decoded, role: "ADMIN" })).toString("base64url");

    expect(verifyToken(`${header}.${forged}.${signature}`)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const token = jwt.sign({ role: "ADMIN" }, "another-secret-of-at-least-32-characters", {
      subject: user.id,
    });
    expect(verifyToken(token)).toBeNull();
  });

  it("rejects an unsigned token (alg: none)", () => {
    const token = jwt.sign({ role: "ADMIN" }, null, { algorithm: "none", subject: user.id });
    expect(verifyToken(token)).toBeNull();
  });

  it("rejects an expired token", () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 60;
    const token = jwt.sign({ role: "USER", sub: user.id, exp: expiredAt }, secret);
    expect(verifyToken(token)).toBeNull();
  });

  it("rejects a correctly signed token with an unexpected payload", () => {
    const token = jwt.sign({ role: "SUPERUSER" }, secret, { subject: user.id });
    expect(verifyToken(token)).toBeNull();
  });
});

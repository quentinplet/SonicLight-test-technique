import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ConflictError, UnauthorizedError } from "../../src/errors/app-error.js";
import { verifyToken } from "../../src/lib/jwt.js";
import { prisma } from "../../src/lib/prisma.js";
import { getMe, login, register } from "../../src/services/auth.service.js";
import { resetDatabase } from "../helpers/db.js";

const credentials = { userName: "alice", password: "correct-horse" };

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe("register", () => {
  it("creates a USER and returns a token for it, without the password hash", async () => {
    const { token, user } = await register(credentials);

    expect(user).toEqual({ id: expect.any(String), userName: "alice", role: "USER" });
    expect(user).not.toHaveProperty("passwordHash");
    expect(verifyToken(token)).toEqual({ id: user.id, role: "USER" });
  });

  it("refuses a user name that is already taken", async () => {
    await register(credentials);
    await expect(register(credentials)).rejects.toThrow(ConflictError);
  });

  it("lets only one of two simultaneous sign-ups with the same name win", async () => {
    const results = await Promise.allSettled([register(credentials), register(credentials)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.user.count()).toBe(1);
  });
});

describe("login", () => {
  it("returns a token for the right password", async () => {
    await register(credentials);
    const { user } = await login(credentials);
    expect(user.userName).toBe("alice");
  });

  it("gives the same error for a wrong password and an unknown user name", async () => {
    await register(credentials);
    const wrongPassword = login({ ...credentials, password: "wrong-password" });
    const unknownUser = login({ ...credentials, userName: "nobody" });

    await expect(wrongPassword).rejects.toThrow(UnauthorizedError);
    await expect(unknownUser).rejects.toThrow(UnauthorizedError);
    const messages = await Promise.all([wrongPassword, unknownUser].map((p) => p.catch((e: Error) => e.message)));
    expect(messages[0]).toBe(messages[1]);
  });
});

describe("getMe", () => {
  it("reads the role from the database, not from the token", async () => {
    const { user } = await register(credentials);
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    expect((await getMe(user.id)).role).toBe("ADMIN");
  });

  it("rejects a token whose account no longer exists", async () => {
    const { user } = await register(credentials);
    await resetDatabase();
    await expect(getMe(user.id)).rejects.toThrow(UnauthorizedError);
  });
});

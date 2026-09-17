import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ConflictError, UnauthorizedError } from "../../src/errors/app-error.js";
import { verifyToken } from "../../src/lib/jwt.js";
import { prisma } from "../../src/lib/prisma.js";
import { getMe, login, register } from "../../src/services/auth.service.js";
import { resetDatabase } from "../helpers/db.js";

const credentials = { userName: "alice", password: "correct-horse" };

beforeEach(resetDatabase);

/** The id is no longer in responses: tests read it from the database. */
async function idOf(userName: string): Promise<string> {
  return (await prisma.user.findUniqueOrThrow({ where: { userName } })).id;
}

afterAll(() => prisma.$disconnect());

describe("register", () => {
  it("creates a USER and returns a token for it, without the password hash or the id", async () => {
    const { token, user } = await register(credentials);

    expect(user).toEqual({ userName: "alice", role: "USER" });
    expect(verifyToken(token)).toEqual({ id: await idOf("alice"), role: "USER" });
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
    await register(credentials);
    const id = await idOf("alice");
    await prisma.user.update({ where: { id }, data: { role: "ADMIN" } });
    expect(await getMe(id)).toEqual({ userName: "alice", role: "ADMIN" });
  });

  it("rejects a token whose account no longer exists", async () => {
    await register(credentials);
    const id = await idOf("alice");
    await resetDatabase();
    await expect(getMe(id)).rejects.toThrow(UnauthorizedError);
  });
});

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NotFoundError } from "../../src/errors/app-error.js";
import { prisma } from "../../src/lib/prisma.js";
import { getDrawing, removeDrawing, saveDrawing } from "../../src/services/drawing.service.js";
import { createUser, drawingData } from "../helpers/fixtures.js";
import { resetDatabase } from "../helpers/db.js";

let alice: string;
let bob: string;

beforeEach(async () => {
  await resetDatabase();
  alice = await createUser("alice");
  bob = await createUser("bob");
});

afterAll(() => prisma.$disconnect());

describe("ownership isolation", () => {
  it("never returns someone else's drawing", async () => {
    await saveDrawing(alice, { title: "Alice", data: drawingData("#e11d48") });

    // Bob has none of his own, and Alice's is invisible to him.
    await expect(getDrawing(bob)).rejects.toThrow(NotFoundError);
  });

  it("does not let a save overwrite someone else's drawing", async () => {
    await saveDrawing(alice, { title: "Alice", data: drawingData("#e11d48") });
    await saveDrawing(bob, { title: "Bob", data: drawingData("#0e7490") });

    expect((await getDrawing(alice)).title).toBe("Alice");
    expect((await getDrawing(alice)).data.strokes[0]?.color).toBe("#e11d48");
    expect(await prisma.drawing.count()).toBe(2);
  });

  it("does not let a delete reach someone else's drawing", async () => {
    await saveDrawing(alice, { title: "Alice", data: drawingData() });

    await expect(removeDrawing(bob)).rejects.toThrow(NotFoundError);
    expect(await prisma.drawing.count()).toBe(1);
  });
});

describe("saveDrawing", () => {
  it("replaces the drawing instead of adding one", async () => {
    const first = await saveDrawing(alice, { title: "First", data: drawingData("#e11d48") });
    const second = await saveDrawing(alice, { title: "Second", data: drawingData("#15803d") });

    expect(await prisma.drawing.count()).toBe(1);
    expect((await getDrawing(alice)).title).toBe("Second");
    expect((await getDrawing(alice)).data.strokes[0]?.color).toBe("#15803d");
    // Same row: it keeps the date of the very first save.
    expect(second.createdAt).toEqual(first.createdAt);
  });

  it("falls back to the owner's user name on a first save without a title", async () => {
    expect((await saveDrawing(alice, { data: drawingData() })).title).toBe("alice");
  });

  it("keeps the previous title when saving without one", async () => {
    await saveDrawing(alice, { title: "Sunrise", data: drawingData() });

    expect((await saveDrawing(alice, { data: drawingData("#15803d") })).title).toBe("Sunrise");
    expect((await saveDrawing(alice, { title: "   ", data: drawingData() })).title).toBe("Sunrise");
    expect((await getDrawing(alice)).title).toBe("Sunrise");
  });

  it("stores the geometry as sent, in normalised coordinates", async () => {
    const data = drawingData();
    await saveDrawing(alice, { data });
    expect((await getDrawing(alice)).data).toEqual(data);
  });
});

describe("removeDrawing", () => {
  it("deletes the drawing, and says so when there is none", async () => {
    await saveDrawing(alice, { data: drawingData() });

    await removeDrawing(alice);
    expect(await prisma.drawing.count()).toBe(0);
    await expect(removeDrawing(alice)).rejects.toThrow(NotFoundError);
  });

  it("deletes a user's drawing along with the account", async () => {
    await saveDrawing(alice, { data: drawingData() });

    await prisma.user.delete({ where: { id: alice } });
    expect(await prisma.drawing.count()).toBe(0);
  });
});

import { NotFoundError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import {
  DrawingDataSchema,
  type SaveDrawingInput,
} from "../schemas/drawing.schema.js";
import type { DrawingData } from "../types/drawing.js";

/** A drawing as it leaves this service. The id stays inside: the token names the owner. */
export interface DrawingDto {
  title: string;
  data: DrawingData;
  createdAt: Date;
  updatedAt: Date;
}

// Every function takes the owner's userId: isolation is in the signature, and userId is
// the whole key of the query — no drawing id ever comes from the client.
export async function getDrawing(userId: string): Promise<DrawingDto> {
  const drawing = await prisma.drawing.findUnique({ where: { userId } });
  if (!drawing) throw new NotFoundError("drawing.notFound", "No drawing yet.");
  return {
    title: drawing.title,
    // Prisma types a Json column as JsonValue: parsed, never cast — a corrupted row would
    // otherwise reach the canvas and crash the render.
    data: DrawingDataSchema.parse(drawing.data),
    createdAt: drawing.createdAt,
    updatedAt: drawing.updatedAt,
  };
}

/**
 * Creates the drawing, or replaces the existing one: userId is unique.
 * Without a title, an existing drawing keeps the one it had, and a first save takes the
 * owner's user name. Trimmed here too: the service does not rely on its caller.
 */
export async function saveDrawing(
  userId: string,
  input: SaveDrawingInput,
): Promise<DrawingDto> {
  const title = input.title?.trim();

  // upsert = update if exists, else create. The unique key is userId, so there is only one drawing per user.
  const drawing = await prisma.drawing.upsert({
    where: { userId },
    update: title ? { title, data: input.data } : { data: input.data },
    create: { title: title || (await ownerName(userId)), data: input.data, userId },
  });
  return {
    title: drawing.title,
    data: input.data,
    createdAt: drawing.createdAt,
    updatedAt: drawing.updatedAt,
  };
}

export async function removeDrawing(userId: string): Promise<void> {
  const deleted = await prisma.drawing.deleteMany({ where: { userId } });
  if (deleted.count === 0)
    throw new NotFoundError("drawing.notFound", "No drawing yet.");
}

async function ownerName(userId: string): Promise<string> {
  const owner = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { userName: true },
  });
  return owner.userName;
}

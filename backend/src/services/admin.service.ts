import { NotFoundError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { DrawingDataSchema } from "../schemas/drawing.schema.js";
import type { DrawingData } from "../types/drawing.js";

/**
 * Admin access lives in its own file, with explicitly named functions — never an optional
 * `userId?` added to the user-facing service, which would make an omission silent.
 */

/** A row of the admin list: no `data`, which would be megabytes to render twenty titles. */
export interface DrawingSummary {
  id: string;
  title: string;
  userName: string;
  updatedAt: Date;
}

export interface DrawingWithAuthor {
  id: string;
  title: string;
  userName: string;
  data: DrawingData;
  updatedAt: Date;
}

export async function listAllForAdmin(): Promise<DrawingSummary[]> {
  const drawings = await prisma.drawing.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, user: { select: { userName: true } } },
  });

  return drawings.map(({ user, ...drawing }) => ({ ...drawing, userName: user.userName }));
}

export async function getByIdForAdmin(id: string): Promise<DrawingWithAuthor> {
  const drawing = await prisma.drawing.findUnique({
    where: { id },
    include: { user: { select: { userName: true } } },
  });
  if (!drawing) throw new NotFoundError("drawing.notFound", "Drawing not found.");

  return {
    id: drawing.id,
    title: drawing.title,
    userName: drawing.user.userName,
    // Parsed, never cast: a corrupted row is caught here, not in the browser.
    data: DrawingDataSchema.parse(drawing.data),
    updatedAt: drawing.updatedAt,
  };
}

/** Moderation: the admin may delete any drawing, which no user route can do. */
export async function removeForAdmin(id: string): Promise<void> {
  const deleted = await prisma.drawing.deleteMany({ where: { id } });
  if (deleted.count === 0) throw new NotFoundError("drawing.notFound", "Drawing not found.");
}

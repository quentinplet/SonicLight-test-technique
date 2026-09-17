import { prisma } from "../../src/lib/prisma.js";

/** Empties the test database. Drawings go with their users (onDelete: Cascade). */
export async function resetDatabase(): Promise<void> {
  await prisma.user.deleteMany();
}

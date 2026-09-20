import type { Role } from "../src/generated/prisma/enums.js";
import { prisma } from "../src/lib/prisma.js";
import { DrawingDataSchema } from "../src/schemas/drawing.schema.js";
import { hashPassword } from "../src/services/auth.service.js";
import type { DrawingData } from "../src/types/drawing.js";
import { burst, spiral, waves } from "./shapes.js";

/**
 * These passwords are committed to a public repository, so what the seed is allowed to
 * create depends on where it runs.
 *
 * In production it creates the USER accounts and their drawings — a demonstration needs
 * something to show, and a user can only reach their own drawing, which anyone could create
 * by registering anyway. It never creates the ADMIN: that one account can delete everybody
 * else's work, so it is made by hand, with a password that exists nowhere in this repository.
 */
const IS_PRODUCTION = process.env.NODE_ENV === "production";

interface DemoUser {
  userName: string;
  password: string;
  role: Role;
  /** Drawn for them, so the admin view has something to show on a fresh clone. */
  drawing?: { title: string; data: DrawingData };
}

const DEMO_USERS: DemoUser[] = [
  {
    userName: "demo",
    password: "demo1234",
    role: "USER",
    drawing: { title: "Spiral", data: spiral("#7c3aed") },
  },
  {
    userName: "alex",
    password: "alex1234",
    role: "USER",
    drawing: { title: "Three waves", data: waves(["#e11d48", "#a16207", "#15803d"]) },
  },
  {
    userName: "sam",
    password: "sam12345",
    role: "USER",
    drawing: {
      title: "Burst",
      data: burst(["#18181b", "#e11d48", "#a16207", "#15803d", "#7c3aed"]),
    },
  },
  // No drawing: the admin moderates other people's work, which makes the demo read better
  // and exercises the empty canvas when signing in as an admin.
  { userName: "admin", password: "admin1234", role: "ADMIN" },
];

async function main(): Promise<void> {
  // Filtered, not skipped inside the loop: an ADMIN cannot be created in production by
  // forgetting a condition — it is simply not in the list.
  const accounts = IS_PRODUCTION ? DEMO_USERS.filter(({ role }) => role === "USER") : DEMO_USERS;

  for (const { userName, password, role, drawing } of accounts) {
    // upsert with an empty update: creates the account once, leaves an existing one untouched.
    const user = await prisma.user.upsert({
      where: { userName },
      update: {},
      create: { userName, role, passwordHash: await hashPassword(password) },
    });
    console.log(`Account "${userName}" (${role}) is present`);

    if (!drawing) continue;
    // Parsed before insert: a generated drawing must obey the same rules as a posted one.
    const data = DrawingDataSchema.parse(drawing.data);
    await prisma.drawing.upsert({
      where: { userId: user.id },
      update: {},
      create: { title: drawing.title, data, userId: user.id },
    });
    console.log(`  drawing "${drawing.title}" (${data.strokes.length} strokes) is present`);
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}

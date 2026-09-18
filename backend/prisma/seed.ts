import type { Role } from "../src/generated/prisma/enums.js";
import { prisma } from "../src/lib/prisma.js";
import { DrawingDataSchema } from "../src/schemas/drawing.schema.js";
import { hashPassword } from "../src/services/auth.service.js";
import type { DrawingData } from "../src/types/drawing.js";
import { burst, spiral, waves } from "./shapes.js";

// These passwords are committed to the repository: they must never reach a real database.
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: NODE_ENV is production.");
  process.exit(1);
}

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
    drawing: { title: "Three waves", data: waves(["#e11d48", "#0e7490", "#15803d"]) },
  },
  {
    userName: "sam",
    password: "sam12345",
    role: "USER",
    drawing: { title: "Burst", data: burst(["#e11d48", "#c2410c", "#a16207", "#15803d", "#0e7490", "#7c3aed"]) },
  },
  // No drawing: the admin moderates other people's work, which makes the demo read better
  // and exercises the empty canvas when signing in as an admin.
  { userName: "admin", password: "admin1234", role: "ADMIN" },
];

async function main(): Promise<void> {
  for (const { userName, password, role, drawing } of DEMO_USERS) {
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

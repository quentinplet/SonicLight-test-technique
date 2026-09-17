import bcrypt from "bcryptjs";
import type { Role } from "../src/generated/prisma/enums.js";
import { prisma } from "../src/lib/prisma.js";

// These passwords are committed to the repository: they must never reach a real database.
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: NODE_ENV is production.");
  process.exit(1);
}

// Same cost as registration will use, so these accounts log in through the real flow.
const BCRYPT_COST = 10;

const DEMO_USERS: { userName: string; password: string; role: Role }[] = [
  { userName: "demo", password: "demo1234", role: "USER" },
  { userName: "admin", password: "admin1234", role: "ADMIN" },
];

async function main(): Promise<void> {
  for (const { userName, password, role } of DEMO_USERS) {
    // upsert with an empty update: creates the account once, leaves an existing one untouched.
    await prisma.user.upsert({
      where: { userName },
      update: {},
      create: { userName, role, passwordHash: await bcrypt.hash(password, BCRYPT_COST) },
    });
    console.log(`Account "${userName}" (${role}) is present`);
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}

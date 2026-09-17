import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError } from "../errors/app-error.js";
import { Prisma } from "../generated/prisma/client.js";
import type { Role } from "../generated/prisma/enums.js";
import { signToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import type { Credentials } from "../schemas/auth.schema.js";

const BCRYPT_COST = 10;

/** The one place a password is hashed — registration and the seed both go through it. */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

// Compared against when the user name is unknown, so a failed login costs the same time
// whether the account exists or not: response time must not reveal which names are taken.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser", BCRYPT_COST);

/** What leaves this service about a user. Built explicitly: passwordHash never does. */
export interface UserDto {
  id: string;
  userName: string;
  role: Role;
}

export interface AuthResult {
  token: string;
  user: UserDto;
}

const userDto = { id: true, userName: true, role: true } as const;

export async function register({ userName, password }: Credentials): Promise<AuthResult> {
  const passwordHash = await hashPassword(password);
  try {
    // role is never taken from the input: every registration is a USER.
    const user = await prisma.user.create({ data: { userName, passwordHash }, select: userDto });
    return { token: signToken(user), user };
  } catch (err) {
    // The unique index decides, not a prior lookup: two simultaneous sign-ups cannot both win.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("auth.userNameTaken", "User name already taken.");
    }
    throw err;
  }
}

export async function login({ userName, password }: Credentials): Promise<AuthResult> {
  const account = await prisma.user.findUnique({ where: { userName } });
  const passwordMatches = await bcrypt.compare(password, account?.passwordHash ?? DUMMY_HASH);
  if (!account || !passwordMatches) {
    // Same error for an unknown name and a wrong password: no account enumeration.
    throw new UnauthorizedError("auth.invalidCredentials", "Invalid user name or password.");
  }
  const user: UserDto = { id: account.id, userName: account.userName, role: account.role };
  return { token: signToken(user), user };
}

/** Re-read from the database: the source of truth for identity and role, not the token. */
export async function getMe(userId: string): Promise<UserDto> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: userDto });
  // A valid token for a deleted account.
  if (!user) throw new UnauthorizedError("auth.unauthorized", "Missing or invalid token.");
  return user;
}

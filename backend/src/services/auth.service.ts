import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError } from "../errors/app-error.js";
import { Prisma } from "../generated/prisma/client.js";
import type { Role } from "../generated/prisma/enums.js";
import { signToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";

const BCRYPT_COST = 10;

/** The one place a password is hashed — registration and the seed both go through it. */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * What leaves this service about a user. Built explicitly: passwordHash never does, and
 * neither does the id — the client never needs it, since the token names the user.
 */
export interface UserDto {
  userName: string;
  role: Role;
}

export interface AuthResult {
  token: string;
  user: UserDto;
}

const toDto = ({ userName, role }: UserDto): UserDto => ({ userName, role });

export async function register({ userName, password }: RegisterInput): Promise<AuthResult> {
  const passwordHash = await hashPassword(password);
  try {
    // role is never taken from the input: every registration is a USER.
    const user = await prisma.user.create({ data: { userName, passwordHash } });
    return { token: signToken(user), user: toDto(user) };
  } catch (err) {
    // The unique index decides, not a prior lookup: two simultaneous sign-ups cannot both win.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("auth.userNameTaken", "User name already taken.");
    }
    throw err;
  }
}

export async function login({ userName, password }: LoginInput): Promise<AuthResult> {
  const account = await prisma.user.findUnique({ where: { userName } });
  // Same error for an unknown name and a wrong password.
  if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
    throw new UnauthorizedError("auth.invalidCredentials", "Invalid user name or password.");
  }
  return { token: signToken(account), user: toDto(account) };
}

/** Re-read from the database: the source of truth for identity and role, not the token. */
export async function getMe(userId: string): Promise<UserDto> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  // A valid token for a deleted account.
  if (!user) throw new UnauthorizedError("auth.unauthorized", "Missing or invalid token.");
  return toDto(user);
}

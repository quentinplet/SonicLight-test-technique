import { z } from "zod";

/**
 * Registration: enforces the format rules of a new account.
 * `abort: true` stops at the first failing rule, so an empty field reads "is required",
 * not "is required" plus "must be at least 3 characters".
 */
export const RegisterSchema = z.object({
  userName: z
    .string({ error: "User name is required" })
    .trim()
    .toLowerCase() // "Demo" and "demo" are the same account
    .min(1, { error: "User name is required", abort: true })
    .min(3, { error: "User name must be at least 3 characters", abort: true })
    .max(30, { error: "User name must be at most 30 characters", abort: true })
    .regex(/^[a-z0-9_-]+$/, "User name can only contain letters, digits, _ and -"),
  password: z
    .string({ error: "Password is required" })
    .min(1, { error: "Password is required", abort: true })
    .min(8, { error: "Password must be at least 8 characters", abort: true })
    // Well under bcrypt's 72-byte limit, so no truncation to worry about.
    .max(30, "Password must be at most 30 characters"),
});

/**
 * Login: only checks that both fields are filled. Format rules are not re-applied here —
 * they would reveal them to whoever probes credentials, and lock out accounts created
 * before a rule changed. A wrong value is simply an invalid credential.
 */
export const LoginSchema = z.object({
  userName: z
    .string({ error: "User name is required" })
    .trim()
    .toLowerCase()
    .min(1, "User name is required"),
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

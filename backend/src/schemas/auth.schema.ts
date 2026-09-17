import { z } from "zod";

export const CredentialsSchema = z.object({
  // Lowercased before validation: "Demo" and "demo" are the same account.
  userName: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]{3,30}$/, "3 to 30 characters: letters, digits, _ or -"),
  // Capped at 72: bcrypt silently ignores anything beyond 72 bytes.
  password: z.string().min(8).max(72),
});

export type Credentials = z.infer<typeof CredentialsSchema>;

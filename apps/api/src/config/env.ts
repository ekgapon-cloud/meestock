import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  /** Comma-separated allowed origins for CORS. Unset = reflect any origin (dev convenience only — must be set in production). */
  CORS_ORIGIN: z.string().optional(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("8h"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().positive().default(10),
  /** Hours a request may sit in PENDING_APPROVAL before it's flagged overdue in the UI (badge only, no notifications). */
  MATERIAL_ISSUE_APPROVAL_SLA_HOURS: z.coerce.number().positive().default(24),
  /** Days a request may sit APPROVED (awaiting fulfillment) before it's flagged overdue. */
  MATERIAL_ISSUE_FULFILLMENT_SLA_DAYS: z.coerce.number().positive().default(3),
});

export const env = envSchema.parse(process.env);

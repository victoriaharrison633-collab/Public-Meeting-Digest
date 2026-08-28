import "server-only";
import { z } from "zod";

/**
 * Every environment variable this app reads. Parsed at module load, so a missing
 * required var crashes at startup rather than at first request.
 *
 * Nothing else in the codebase reads process.env directly.
 */

const serverSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  AI_MODEL: z.string().min(1, "AI_MODEL is required (see .env.example)"),
  NEXT_PUBLIC_APP_URL: z.url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = serverSchema.safeParse({
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  const missing = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment configuration:\n${missing}\n\nCopy .env.example to .env.local and fill it in.`,
  );
}

export const env = parsed.data;

// Rule 16: refuse to BOOT in production with development config.
//
// Skipped during `next build`, which runs with NODE_ENV=production while still
// reading .env.local — a local production build against localhost is legitimate.
// The guard that matters is the one on the deployed server, and this still fires
// there.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (
  !isBuildPhase &&
  env.NODE_ENV === "production" &&
  env.NEXT_PUBLIC_APP_URL.includes("localhost")
) {
  throw new Error(
    "NEXT_PUBLIC_APP_URL points at localhost while NODE_ENV=production. " +
      "The CSRF Origin check would reject every request. Set it to the deployed origin.",
  );
}

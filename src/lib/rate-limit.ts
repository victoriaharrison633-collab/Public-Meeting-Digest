import "server-only";
import { RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

/**
 * In-memory sliding-window rate limiter.
 *
 * DELIBERATE LIMITATION, read before relying on this:
 * this Map lives in one serverless instance's memory. It resets on cold start and
 * is not shared across concurrent instances, so a determined caller can exceed the
 * limit by spreading requests. It raises the bar against casual abuse; it is not a
 * hard control.
 *
 * The REAL backstop for this build is the spend limit set in the Anthropic Console.
 * Set it before deploying.
 *
 * BUILD.md Prompt 2b replaces this module with Upstash Redis (shared across
 * instances, plus a global daily USD ceiling). Swap it there; the exported
 * signature is intentionally the same shape.
 */

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  const recent = (hits.get(ip) ?? []).filter((t) => t > cutoff);

  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000),
      ),
    };
  }

  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic prune so the Map cannot grow without bound on a warm instance.
  if (hits.size > 1000) {
    for (const [key, times] of hits) {
      const live = times.filter((t) => t > cutoff);
      if (live.length === 0) hits.delete(key);
      else hits.set(key, live);
    }
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT - recent.length,
    retryAfterSeconds: 0,
  };
}

/** Test-only reset. Not called by application code. */
export function __resetRateLimit(): void {
  hits.clear();
}

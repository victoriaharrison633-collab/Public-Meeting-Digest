import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { ModelDeprecatedError } from "@/lib/ai-client";
import { MAX_BODY_BYTES } from "@/lib/constants";
import { logger } from "@/lib/logger";

/**
 * Every route is wrapped in this. Order matters: size, then content-type, then rate
 * limit, then the handler inside a try/catch.
 *
 * Rule 5 — the client only ever receives { error: string } with a generic message.
 * Stack traces, SDK text and the model id go to the server log, never the browser.
 */

export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

function fail(status: number, error: string, extra?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers: extra });
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

type Handler = (req: NextRequest) => Promise<NextResponse>;

export function withErrorHandling(handler: Handler): Handler {
  return async (req: NextRequest): Promise<NextResponse> => {
    // 1. Body size, before parsing.
    const declared = req.headers.get("content-length");
    if (declared && Number(declared) > MAX_BODY_BYTES) {
      return fail(413, "Request too large.");
    }

    // 2. Content type.
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return fail(415, "Unsupported content type.");
    }

    // 3. Rate limit.
    const limit = checkRateLimit(clientIp(req));
    if (!limit.allowed) {
      return fail(429, "Too many requests. Please wait a moment and try again.", {
        "Retry-After": String(limit.retryAfterSeconds),
      });
    }

    // 4. Run.
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn("Validation failed", err.issues);
        return fail(400, "The request could not be processed.");
      }
      if (err instanceof ModelDeprecatedError) {
        logger.error("Model deprecated", err);
        return fail(502, "The processing service is unavailable.");
      }
      if (err instanceof UpstreamError) {
        logger.error("Upstream failure", err);
        return fail(502, "The processing service is unavailable.");
      }
      logger.error("Unhandled route error", err);
      return fail(500, "Something went wrong.");
    }
  };
}

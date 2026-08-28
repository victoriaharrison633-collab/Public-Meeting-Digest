import { NextResponse, type NextRequest } from "next/server";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { withErrorHandling, UpstreamError } from "@/lib/api-handler";
import { getClient, getModel, mapModelError } from "@/lib/ai-client";
import { SYSTEM_PROMPT, buildDocumentText, buildUserContent } from "@/lib/prompt";
import { cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import {
  DigestRequestSchema,
  DigestResponseSchema,
  DigestResponseWireSchema,
  validateSourcePages,
} from "@/lib/schema";
import {
  COST_PER_MTOK_IN,
  COST_PER_MTOK_OUT,
  EFFORT,
  MAX_TOKENS,
} from "@/lib/constants";
import { logger } from "@/lib/logger";

// The SDK and streaming need Node, not Edge. 300s covers a long document with
// adaptive thinking; see BUILD-FAST Prompt 7 for verifying this applied in production.
export const runtime = "nodejs";
export const maxDuration = 300;

async function handler(req: NextRequest): Promise<NextResponse> {
  // Throws ZodError on a bad body; withErrorHandling maps that to a generic 400.
  const body = DigestRequestSchema.parse(await req.json());

  const documentText = buildDocumentText(body.pages);
  const model = getModel();
  const key = cacheKey(documentText, model);

  const cached = cacheGet(key);
  if (cached) {
    logger.info(`Cache hit for "${body.filename}" — no model call, no spend.`);
    return NextResponse.json(cached);
  }

  let parsed: unknown;
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const stream = getClient().beta.messages.stream({
      model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      output_config: {
        effort: EFFORT,
        // Wire schema: cross-field refinements have no JSON Schema representation.
        // The strict schema below is what actually enforces them.
        format: betaZodOutputFormat(DigestResponseWireSchema),
      },
      // Guardrail only. A policy decline on public meeting minutes is unlikely, but
      // a silent one would look like a bug.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [
        { role: "user", content: buildUserContent(body.filename, body.pages) },
      ],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      throw new UpstreamError(
        `Refused: ${message.stop_details?.category ?? "unspecified"}`,
      );
    }

    inputTokens = message.usage.input_tokens;
    outputTokens = message.usage.output_tokens;
    parsed = message.parsed_output;
  } catch (err) {
    mapModelError(err);
  }

  const usd =
    (inputTokens / 1_000_000) * COST_PER_MTOK_IN +
    (outputTokens / 1_000_000) * COST_PER_MTOK_OUT;
  logger.info(
    `Digest "${body.filename}": ${inputTokens} in / ${outputTokens} out — $${usd.toFixed(3)}`,
  );

  if (parsed === null || parsed === undefined) {
    throw new UpstreamError("Model returned no parseable structured output.");
  }

  // Strict validation: this is where the refinements the wire schema could not
  // express are actually enforced.
  const result = DigestResponseSchema.parse({
    ...(parsed as object),
    // Never trust the model's echo of the filename.
    filename: body.filename,
  });

  // Server-side grounding check. An item citing a page that does not exist is
  // unverifiable, and an unverifiable citation rendered as fact is the exact
  // failure the audit table exists to catch.
  const orphans = validateSourcePages(result, body.pages);
  if (orphans.length > 0) {
    logger.error(
      `Rejected "${body.filename}": ${orphans.length} item(s) cite a page not in the document.`,
      orphans,
    );
    throw new UpstreamError("Response cited pages outside the document.");
  }

  cacheSet(key, result);
  return NextResponse.json(result);
}

export const POST = withErrorHandling(handler);

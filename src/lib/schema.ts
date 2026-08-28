import { z } from "zod";
import {
  MATCH_VALUES,
  MAX_EXTRACTED_CHARS,
  SOURCE_CHECK_VALUES,
} from "./constants";

/**
 * This app has no database. These schemas are its shared foundation and this file
 * is their sole owner — the route, the components, the audit builder and the
 * exporters all import from here. There is no `z.object` anywhere else.
 *
 * WIRE vs STRICT, and why the split matters:
 * the `*Wire` schemas are plain objects with no cross-field refinements, because
 * they are converted to a JSON Schema for the model's structured output and a
 * refinement has no JSON Schema representation. The refined schemas below them are
 * what the server validates the model's reply against. The model is told the shape;
 * the server enforces the rules.
 */

// ── Request ──────────────────────────────────────────────────────────────

export const PageSchema = z.object({
  page: z.number().int().positive(),
  text: z.string(),
});

export const DigestRequestSchema = z
  .object({
    filename: z.string().min(1),
    pages: z.array(PageSchema).min(1),
  })
  .refine(
    (r) => r.pages.reduce((n, p) => n + p.text.length, 0) <= MAX_EXTRACTED_CHARS,
    { message: `Extracted text exceeds ${MAX_EXTRACTED_CHARS} characters.` },
  );

// ── Model output (wire shape — no refinements) ───────────────────────────

export const MemberVoteSchema = z.object({
  name: z.string(),
  vote: z.string(),
});

export const VoteSchema = z.object({
  for: z.number().int().nullable(),
  against: z.number().int().nullable(),
  abstain: z.number().int().nullable(),
  memberVotes: z.array(MemberVoteSchema).nullable(),
  asStated: z.string().min(1),
});

export const DigestItemWireSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  classification: z.enum(["decision", "procedural"]),
  classificationReason: z.string().min(1),
  decision: z.string().nullable(),
  deferred: z.boolean(),
  deferralNote: z.string().nullable(),
  vote: VoteSchema.nullable(),
  impactNote: z.string().nullable(),
  confidence: z.enum(["clear", "uncertain"]),
  uncertaintyReason: z.string().nullable(),
  sourcePage: z.number().int().positive(),
  sourceQuote: z.string().min(1).max(300),
});

export const DigestResponseWireSchema = z.object({
  filename: z.string(),
  documentSummary: z.string().min(1),
  segmentationNote: z.string().min(1),
  items: z.array(DigestItemWireSchema),
});

// ── Model output (strict — what the server enforces) ─────────────────────

/**
 * Two refinements, and both must actually reject. They are what stop the model
 * hedging in two directions at once: flagging uncertainty without saying why, or
 * calling an item procedural while still writing a resident-impact note for it.
 * Do not soften either to a warning.
 */
export const DigestItemSchema = DigestItemWireSchema.refine(
  (i) => i.confidence !== "uncertain" || i.uncertaintyReason !== null,
  {
    message: 'confidence "uncertain" requires an uncertaintyReason.',
    path: ["uncertaintyReason"],
  },
).refine((i) => i.classification !== "procedural" || i.impactNote === null, {
  message: 'classification "procedural" requires impactNote to be null.',
  path: ["impactNote"],
});

export const DigestResponseSchema = z.object({
  filename: z.string(),
  documentSummary: z.string().min(1),
  segmentationNote: z.string().min(1),
  // No minimum: a document genuinely containing no items is a reportable outcome,
  // not a validation failure.
  items: z.array(DigestItemSchema),
});

// ── Audit table (derived in code — never model output) ───────────────────

export const AuditRowSchema = z.object({
  itemId: z.string(),
  digestSays: z.string(),
  sourceSays: z.string(),
  sourceCheck: z.enum(SOURCE_CHECK_VALUES),
  humanMatch: z.enum(MATCH_VALUES),
  humanNotes: z.string(),
});

// ── Server-side grounding check ──────────────────────────────────────────

/**
 * Returns the ids of items citing a page that is not in the request.
 *
 * This runs before any response reaches the browser. A model citing page 40 of a
 * 12-page document must be caught here — an unverifiable citation rendered as fact
 * is exactly the failure the audit table exists to prevent.
 */
export function validateSourcePages(
  response: { items: { id: string; sourcePage: number }[] },
  pages: { page: number }[],
): string[] {
  const known = new Set(pages.map((p) => p.page));
  return response.items.filter((i) => !known.has(i.sourcePage)).map((i) => i.id);
}

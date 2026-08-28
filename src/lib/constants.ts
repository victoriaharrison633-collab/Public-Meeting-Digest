/**
 * Every numeric limit and fixed enum in this app lives here and nowhere else.
 * No other file restates one of these values. See SPEC.md "Fixed constants".
 *
 * The model id is deliberately absent — it lives only in the AI_MODEL env var.
 */

/** Maximum documents accepted in one session (SPEC F1). */
export const MAX_DOCUMENTS = 5;

/** Per-file size cap, enforced client-side before parsing. 25 MB. */
export const MAX_PDF_BYTES = 26_214_400;

/** Per-document extracted-text cap. ~150K tokens; a hard stop on pathological input. */
export const MAX_EXTRACTED_CHARS = 600_000;

/** Citation anchor. The server joins pages with this marker and tells the model so. */
export const pageMarker = (page: number): string => `[[page ${page}]]`;

/** Claude call parameters. */
export const MAX_TOKENS = 32_000;
export const EFFORT = "high" as const;

/** In-memory rate limit: 10 requests per 60s per IP. */
export const RATE_LIMIT = 10;
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Similarity at or above which a non-exact quote match counts as `near`. */
export const NEAR_MATCH_THRESHOLD = 0.9;

/** Computed mechanically from the source text. Never model-supplied. */
export const SOURCE_CHECK_VALUES = ["verified", "near", "not_found"] as const;

/** Operator-filled review column. "" means not yet reviewed. */
export const MATCH_VALUES = ["", "Y", "N", "Partial"] as const;

/** Request body cap enforced before parsing. 2 MB. */
export const MAX_BODY_BYTES = 2_097_152;

/**
 * Fixed UI copy. Restating either string anywhere else is a defect — two places
 * that restate a string eventually disagree.
 */
export const DISCLAIMER =
  "A reading aid, not the official record. Always verify against the published minutes.";
export const UNCERTAIN_BADGE = "Uncertain — verify against official record.";
export const IMPACT_LABEL = "What this may mean for residents";
export const NO_VOTE_TEXT = "No vote recorded in source";

/** Claude Opus 5 list rates, used only to log spend per call (Rule 15). */
export const COST_PER_MTOK_IN = 5;
export const COST_PER_MTOK_OUT = 25;

/** In-memory response cache: the same document is never billed twice on a warm instance. */
export const CACHE_MAX_ENTRIES = 20;

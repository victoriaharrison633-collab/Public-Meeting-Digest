# SPEC — Public Meeting Digest

**Source of truth:** this file. Derived from `PRD.md`. Where the two disagree, this
file wins — the PRD records intent, this file records the exact values the build
prompts reference. Every later prompt points at a value here rather than restating it.

---

## App Specification

**Public Meeting Digest** — upload up to 5 official municipal meeting-minutes PDFs
from *different* municipalities in one session; get a short, item-by-item digest per
document plus a written audit table that puts each digest claim next to its source
text so a human can verify it in seconds.

**Target user:** two, and the build serves both.

- *The Time-Pressed Resident* — cares about one agenda item, will not read 40 pages
  of procedural minutes.
- *The Auditor (you, this build)* — needs to prove the digest didn't drop a real
  decision, didn't invent one, and didn't miscall a procedural item as substantive.

**What a user can do:**

1. Drop up to 5 text-layer PDFs onto one page.
2. Watch each document extract (in-browser) and process (one API call per document).
3. Read a per-document digest: one card per real decision, with decision text, vote
   record, deferral status, an inferred resident-impact note, and a source citation.
4. Read the per-document audit table inline, and mark each row Y / N / Partial.
5. Download the audit table (Markdown or CSV) with their marks included.

**Interface:** one page, one session, no navigation. Nothing persists after the tab
closes.

---

## Non-goals — absent, not stubbed

These are standard in the Gauntlet core and tail phases. This app does not have them,
and the build must not generate scaffolding, placeholder routes, or env vars for them:

| Not built | Consequence for the build |
|---|---|
| **No database** (no Supabase, no Postgres, no RLS) | No schema prompt. State is React state, in memory, for the life of the tab. |
| **No auth** | No login/signup/reset routes, no session middleware, no password policy. |
| **No payments** | No Stripe prompt, no tiers, no `PLANS` constant, no webhooks. |
| **No file storage** | Uploaded PDFs never leave the browser (see Architecture). No buckets. |
| **No multi-user, no admin, no mobile app** | Single anonymous visitor, modern desktop/mobile browser. |
| **No server-side persistence of user content** | The serverless function is stateless: text in, JSON out, nothing written. |

The tail phases that survive: **Polish** and **Testing & CI/CD**. Legal/GDPR reduces to
the disclaimer copy in the UI copy section — there is no account, no cookie, no
tracker, and no stored personal data to write a policy about.

---

## Architecture

```
Browser                                  Vercel Function            Anthropic API
───────                                  ───────────────            ─────────────
1. user drops N PDFs (N <= 5)
2. pdf.js extracts text per page
   -> [{ page: 1, text: "..." }, ...]
3. for each doc, sequentially:
      POST /api/digest ------------->    4. build system prompt
         { filename, pages }                 + user content
                                        5. one Claude call -------->  claude-opus-5
                                        6. validate JSON w/ Zod  <--   DigestResponse
      <------------------------------- 7. return DigestResponse
8. render digest + audit table
9. user marks rows, downloads export
```

**The PDF file never leaves the browser.** This is the load-bearing architectural
decision and it is doing three jobs at once:

- It satisfies "don't persist uploaded PDFs beyond the session" *by construction*
  rather than by policy — there is no server-side code path that could persist one.
- It keeps the request body under Vercel's **4.5 MB** limit. Five 8 MB PDFs uploaded
  raw would exceed it; their extracted text is roughly 600 KB total.
- It keeps the function short. Parsing happens on the user's CPU, so the function's
  entire duration is the Claude call.

**One document per HTTP request.** Documents are unrelated meetings and must never
share a context (PRD section 7). Sequential requests from the client also mean no
single function invocation has to survive five model calls, and the UI gets natural
per-document progress. Requests are sequential, not parallel, so a rate-limit error
affects one document rather than all five.

---

## Pinned stack

| Package | Version | Note |
|---|---|---|
| `next` | `16.3.3` | App Router. |
| `react` / `react-dom` | `19.2.8` | |
| `typescript` | `5.9.3` | Not 7.x — a compiler migration mid-build is not in scope. |
| `@anthropic-ai/sdk` | `0.122.0` | |
| `pdfjs-dist` | `6.2.108` | Client-side only. Worker served from `/public`, not a CDN. |
| `zod` | `4.4.3` | Validates the model's JSON on the server before it reaches the client. |
| `tailwindcss` | `4.3.3` | |
| `@upstash/ratelimit` | `2.0.8` | Fail-closed limiter + global spend ceiling. See below. |
| `@upstash/redis` | `1.38.3` | Backing store for the limiter and the daily cost counter only. Not app state. |
| `@sentry/nextjs` | `10.72.0` | Inert with a placeholder DSN; required so error detail has somewhere to go that isn't the browser. |
| `vitest` | `4.1.11` | |
| `@playwright/test` | `1.62.1` | |
| `eslint` | `10.9.1` | |
| Hosting | Vercel | Node runtime (not Edge — the SDK and streaming need Node). |

**Why Upstash, in an app with no database.** `/api/digest` is an unauthenticated
endpoint on a public URL that spends money on every call. Without a limiter, anyone
who finds the URL can bill your Anthropic account until the key is rotated. Redis here
stores exactly two things — a per-IP request counter and a global daily USD counter —
and never any user content. That is not a persistence layer; the "no database"
decision is intact.

Pin exact versions in `package.json` (no `^`). `pdfjs-dist` must match its worker file
exactly or extraction fails at runtime with a version-mismatch error.

---

## Environment variables

**REQUIRED:**

- `ANTHROPIC_API_KEY` — server-side only. Never referenced in a `NEXT_PUBLIC_*` name,
  never imported into a client component, never sent to the browser.
- `AI_MODEL` — `claude-opus-5`. The model id is never hardcoded in a source file; one
  env var, one spelling, logged at startup.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — limiter and spend ceiling.
- `NEXT_PUBLIC_APP_URL` — the deployed origin. Required, not optional: the CSRF Origin
  check compares against it.

**OPTIONAL:**

- `SENTRY_DSN` — inert with a placeholder. Error *detail* goes here; the browser gets a
  generic message.

That is the whole list. All of it is validated by Zod in `src/lib/env.ts` at startup;
the app crashes on a missing required var rather than failing at first request. Any
prompt that wants to add an env var not on this list is out of scope.

---

## Fixed constants — defined once, referenced everywhere

Declared in `src/lib/constants.ts`. Every other file imports from there; no file
restates a number.

| Constant | Value | Enforced where |
|---|---|---|
| `MAX_DOCUMENTS` | `5` | Upload UI (reject the 6th file). `/api/digest` is per-document and does not need to know. |
| `MAX_PDF_BYTES` | `26_214_400` (25 MB) | Client-side, before parsing. |
| `MAX_EXTRACTED_CHARS` | `600_000` | Client-side, after extraction. About 150K tokens — well inside the 1M window, and a hard stop against a pathological document. |
| `PAGE_MARKER` | `[[page N]]` | Server builds the prompt text by joining pages with this marker. The model is told this is the citation anchor. |
| `MAX_TOKENS` | `32_000` | `/api/digest` only. |
| `EFFORT` | `high` | `/api/digest` only. |
| `RATE_LIMIT` | `10` requests per `60` s per IP | `/api/digest`, fail-closed. |
| `DAILY_COST_CEILING_USD` | `25` | Global, checked before every call; exceeded returns 429. |
| `COST_PER_MTOK_IN` / `_OUT` | `5` / `25` | Claude Opus 5 rates, for the ceiling arithmetic. |
| `CACHE_MAX_ENTRIES` | `20` | In-memory LRU, keyed by SHA-256 of normalized document text. |

The model id is **not** a constant — it comes from `AI_MODEL` (see Environment
variables). Nothing else in the codebase names a model.
| `MATCH_VALUES` | `["", "Y", "N", "Partial"]` | Optional human-review control and both export formats. `""` = not yet reviewed. |
| `SOURCE_CHECK_VALUES` | `["verified", "near", "not_found"]` | Computed mechanically, never model-supplied. See the Audit table section. |
| `NEAR_MATCH_THRESHOLD` | `0.90` | Similarity ratio at or above which a non-exact quote match counts as `near` rather than `not_found`. |

---

## Data model (in-memory only)

No tables. These are the TypeScript shapes, and the Zod schema in `src/lib/schema.ts`
is the single definition — the API route, the React components, and the export
functions all import from it. Do not redeclare these shapes anywhere.

```
ExtractedDoc            // browser only, never sent whole
  id                    string (uuid, client-generated)
  filename              string
  pages                 { page: number; text: string }[]

DigestRequest           // POST body to /api/digest
  filename              string
  pages                 { page: number; text: string }[]

DigestItem
  id                    string
  title                 string            // the agenda item as the source names it
  classification        "decision" | "procedural"
  classificationReason  string            // 1 sentence — why this call, per F3
  decision              string | null     // null when procedural or genuinely no decision
  deferred              boolean
  deferralNote          string | null
  vote                  { for: number|null; against: number|null; abstain: number|null;
                          memberVotes: { name: string; vote: string }[] | null;
                          asStated: string } | null   // null when the source states no vote
  impactNote            string | null     // INFERRED, 1-2 sentences, decisions only
  confidence            "clear" | "uncertain"
  uncertaintyReason     string | null     // required when confidence === "uncertain"
  sourcePage            number            // must be a page number present in the request
  sourceQuote           string            // VERBATIM from the source, <= 300 chars

DigestResponse          // what /api/digest returns
  filename              string
  documentSummary       string            // 1-2 sentences: what meeting, what body, what date
  segmentationNote      string            // how the model determined item boundaries in THIS doc
  items                 DigestItem[]

AuditRow                // derived in code from DigestItem — never generated by the model
  itemId                string
  digestSays            string            // decision + vote + deferral, formatted
  sourceSays            string            // sourceQuote + " (p. N)"
  sourceCheck           "verified" | "near" | "not_found"   // COMPUTED, see below
  humanMatch            "" | "Y" | "N" | "Partial"          // operator, optional
  humanNotes            string                              // operator, optional
```

**`sourceQuote` and `sourcePage` are what make the audit table work.** An item without
a verbatim quote and a real page number cannot be verified in seconds, which is the
entire point of F6. The Zod schema requires both on every item.

---

## The Claude call — exact parameters

One call per document, in `POST /api/digest`. These values live in that route and
nowhere else.

- `model`: from `env.AI_MODEL`, set to `claude-opus-5` — strongest available, per PRD
  section 7. Do not substitute a cheaper model; accuracy is the point of this build.
  A model-not-found 404 throws a named deprecation error rather than a generic 500.
- `max_tokens`: `32000`
- `thinking`: `{ type: "adaptive" }` — cross-format structure inference is exactly the
  kind of work that benefits. Do **not** pass `budget_tokens`; it is rejected with a
  400 on this model.
- `output_config`: `{ effort: "high", format: zodOutputFormat(DigestResponseSchema) }`
  — structured output means the route never hand-parses prose into JSON.
- Streaming: use `client.beta.messages.stream(...)` and `.finalMessage()`. A long
  document with adaptive thinking can run well past a non-streaming HTTP timeout.
- Refusal guardrail: `betas: ["server-side-fallback-2026-07-01"]` with
  `fallbacks: "default"`. Cheap insurance; a policy decline on public meeting minutes
  is unlikely, but a silent one would look like a bug. If this beta pair conflicts with
  `output_config.format` at build time, **drop `fallbacks` and keep the structured
  output** — the structured output is load-bearing, the fallback is not.
- Route config: `export const runtime = "nodejs"` and `export const maxDuration = 300`.
- Validate the parsed result with `DigestResponseSchema` on the server before
  returning, and reject any item whose `sourcePage` is not a page in the request.

---

## System prompt — required content

The prompt lives in `src/lib/prompt.ts` as a single exported constant. Its
non-negotiable contents, mapped to the functional requirements:

1. **Role and no-template rule (F2).** "You are extracting from one specific source
   document. You do not have a fixed template for its structure — infer the item
   boundaries from what is actually there: headings, motion numbering, resolution
   numbers, topic breaks, whatever this document uses." State explicitly that formats
   differ across municipalities and that guessing a familiar template over the
   document's actual structure is the primary failure mode.

2. **Segmentation must be exhaustive (F2, and the recall weighting in PRD section 9).**
   Every discrete agenda item in the document must appear in `items` — *including*
   procedural ones. Procedural items are classified, not dropped. A model that omits
   items it judges unimportant makes F3 unauditable.

3. **Classification rule (F3).** Judge by real-world effect on people, process, or
   things — zoning, budget, ordinances, contracts, appointments, permits are
   decisions; approving prior minutes, roll call, adjournment, scheduling are
   procedural. **Explicitly: do not classify on whether a vote occurred.** Procedural
   items frequently carry votes. Every item gets a one-sentence `classificationReason`
   so a borderline call is reviewable rather than opaque.

4. **Grounding rule (F4).** `decision`, `vote`, `deferred`, and `sourceQuote` must be
   strictly grounded — no invention. If member names are not individually listed,
   `memberVotes` is `null`; do not reconstruct them from an attendance list.

5. **The one licensed inference (F4).** `impactNote` is plain-language, 1-2 sentences,
   and may restate the item's effect in terms a resident understands. It must stay
   tethered to what the item actually says — no speculation about consequences the
   source does not state. Null for procedural items.

6. **Uncertainty over guessing (F5).** If the source is ambiguous about what was
   decided or how the vote went, set `confidence: "uncertain"` with an
   `uncertaintyReason`. State that a flagged item is a correct outcome, not a failure.

7. **Citation rule (F6).** Every item carries the `[[page N]]` number it came from and
   a verbatim quote of at most 300 characters, copied exactly — not paraphrased.

8. **`segmentationNote`.** One or two sentences on how this document's structure was
   read. This is the F2 debugging surface: when document 4 mis-segments, this field is
   where you see why.

---

## Audit table (F7)

**Derived in code from `DigestItem[]`, and self-populating. The model does not generate
this table and never grades itself.** A "Match: Y" written by the same call that
produced the digest verifies nothing: a model that invented a decision will invent
supporting source text for it and mark the row correct. The self-audit is blind in
exactly the cases the audit exists to catch.

The table is a finished deliverable the moment a document finishes processing. It
requires no human input to be complete, and it is the primary artifact demonstrating
output quality.

Columns, exactly:

| Item | Digest says | Source says | Source check | Your review | Notes |
|---|---|---|---|---|---|
| `title` | decision + vote + deferral, formatted | `sourceQuote` plus `p. sourcePage` | **computed** | operator, optional | operator, optional |

### Source check — the mechanical grounding test

This is the quality demonstration, and its trustworthiness comes from the fact that no
model produces it. The browser already extracted the exact text of every page. The
model claims each item is quoted from a specific page. The app therefore searches the
extracted text of that page for the claimed quote:

| Result | Meaning | Renders as |
|---|---|---|
| `verified` | Normalized quote found in the cited page's extracted text | green **"Verified in source"** |
| `near` | Similarity at or above `NEAR_MATCH_THRESHOLD` but not exact | amber **"Near match — check wording"** |
| `not_found` | Quote absent from the cited page | red **"Not found in source"** |

A `not_found` is a fabricated or misattributed citation, caught automatically with zero
trust in the model.

**Normalization before comparison is mandatory, and getting it wrong is the main source
of false alarms.** PDF text extraction routinely introduces artifacts the model's quote
will not reproduce. Before comparing, both strings must be: lowercased; whitespace runs
collapsed to a single space; soft hyphens and hyphen-plus-newline sequences (words
broken across lines) joined; curly quotes, en/em dashes, and ligatures folded to ASCII
equivalents. Compare on the normalized forms; display the original text.

Per document, render a headline tally above the table — for example **"22 of 23 items
verified against source text"** — counting `verified` and `near` separately from
`not_found`.

### The rest of the table

- **Rows:** every item, procedural included. Procedural rows are what let you check the
  "real decisions wrongly excluded" half of the classification axis.
- **Your review** is an optional operator 4-state control (`MATCH_VALUES`), defaulting
  to `""`. React state, not model output, not persisted. It exists for the judgments a
  string match cannot make (see the limits below), and the table is complete and
  exportable without it.
- **Notes** is an optional operator free-text field, same lifetime.
- Uncertain items (`confidence: "uncertain"`) are visually marked in the row so they
  read as flagged-not-missed.

### What the mechanical check does not prove

State this plainly in the UI, near the tally, so the number is not over-read:

- It proves the quote is real and the citation accurate. It does **not** prove the
  quote *supports* the digest claim built on it.
- It cannot detect a decision the model **missed** — a dropped item has no row, so
  nothing in the app knows it existed. Recall is measured by a human reading the
  source, and only that way.
- It says nothing about whether the decision/procedural call in `classification` was
  right, or whether an `impactNote` overreached.

Those three are what the optional **Your review** column and the eval writeup cover.

**Delivery: inline *and* downloadable** — the open question in PRD section 11,
resolved. Inline is the demo; the file is the artifact you attach to the writeup.

- Inline: rendered under each document's digest.
- Download: two buttons per document — `.md` (GitHub-flavored table) and `.csv`
  (RFC 4180 quoting; `sourceQuote` contains commas and quotes, so this must be a real
  escaper, not string concatenation). Both carry all six columns, including the
  computed Source check and the headline tally, plus any operator entries as filled at
  click time. Filename: `audit-<filename-slug>.md` / `.csv`.

---

## Eval scoring (PRD section 7, four axes)

Scored by hand, from the audit table, per document. The app supports the scoring; it
does not compute a grade.

| Axis | Measured by | What it takes |
|---|---|---|
| Citation grounding | **The app, automatically** | Nothing. The Source check column and its tally are the measurement. |
| Precision / hallucination | Human, aided | A `not_found` row is a strong hallucination signal. A `verified` quote that does not actually support the digest claim is not detectable mechanically — mark `N` in Your review. |
| Recall | Human only | Read the source for decisions the digest missed entirely; record the count in the writeup. The app cannot measure this — a missed item has no row. |
| Classification accuracy | Human only | Mark `N` or `Partial` where you disagree with `classification`; `classificationReason` is the thing being judged. |
| Inference groundedness | Human only | Spot-check `impactNote` against `sourceQuote`; disagreements go in Notes. |

Two tallies, and they must not be conflated in the UI:

- The **Source check** tally is automatic and factual — it counts verified / near /
  not-found rows.
- The **Your review** tally counts Y / N / Partial / unreviewed and is only meaningful
  once a human has filled rows in. It is a counter, not a verdict, and neither tally
  may be labelled "accuracy" or "score".

**Red-team documents to source (PRD section 7, Hour 0-0.5).** The 5-document set must
collectively contain: an item with a vote but no listed member votes; an item discussed
then deferred with no vote; a split (non-unanimous) vote; a procedural item that
carries a vote; at least one genuinely borderline item; and at least one document whose
structure is meaningfully unlike the other four. Sourcing these is a prerequisite to
the verification phases, not a build step.

---

## Routes

| Route | Method | Purpose |
|---|---|---|
| `/` | — | The entire app. Upload, per-document digests, audit tables, downloads. |
| `/api/digest` | POST | One document in (`DigestRequest`), one `DigestResponse` out. Stateless. |

No other routes. No `/api/upload` — there is nothing to upload to.

**Error contract for `/api/digest`:** on any failure return `{ error: string }` with a
generic, non-leaking message and the right status — `400` for a body that fails
`DigestRequestSchema`, `429` passed through from a rate limit, `502` for an upstream
API failure, `500` otherwise. Never return the raw SDK error or a stack trace to the
browser. The client renders a per-document error state with a **Retry this document**
button; one document failing must not discard the other four's results.

---

## UI copy constraints

The digest is a reading aid, not the record. Required, and the exact wording is fixed
here so it does not drift across components:

- Persistent header line: **"A reading aid, not the official record. Always verify
  against the published minutes."**
- Uncertain items render the badge: **"Uncertain — verify against official record."**
- No copy anywhere may use "official", "authoritative", "certified", or "verified" to
  describe the app's own output.
- The impact note is labelled **"What this may mean for residents"** — the hedge is
  deliberate; it is the one inferred field.

---

## Requirement traceability

| Req | Where it lives | Verifiable by |
|---|---|---|
| F1 Ingest up to 5 PDFs | Upload component + `MAX_DOCUMENTS` | Dropping 6 files rejects the 6th with a visible message. |
| F2 Format-agnostic segmentation | System prompt 1-2 + `segmentationNote` | All 5 real documents return items; none returns an empty array. |
| F3 Decision classification | System prompt 3 + `classification`, `classificationReason` | Every item has both fields; procedural items are present, not dropped. |
| F4 Per-item extraction | `DigestItem` schema + system prompt 4-5 | Zod rejects a response missing a required field. |
| F5 Confidence flagging | `confidence`, `uncertaintyReason` | An uncertain item renders the badge; `uncertaintyReason` is non-null. |
| F6 Source grounding | `sourcePage`, `sourceQuote` + server-side page check | Every rendered item shows `p. N` and a quote; an out-of-range page is rejected. |
| F7 Audit table | Derived table + source check + `.md` / `.csv` export | Table renders fully populated with no human input; every row shows a computed Source check; a deliberately corrupted `sourceQuote` produces `not_found`; both downloads open and carry the Source check plus any operator marks. |
| F8 Display, no state | Single page, React state only | Reloading the tab clears everything; DevTools shows no storage writes. |

---

## Deployment

Live on Vercel with a public URL — a working deployment is a requirement of this build,
not a stretch goal. `ANTHROPIC_API_KEY` set in Vercel project env (Production and
Preview). Verification is against the deployed URL with all 5 real documents, not
against localhost; `pdfjs-dist` worker loading and function duration both behave
differently in production than in dev, and those are exactly the two things that break.

---

## Decisions resolved from PRD section 11

| Question | Resolution |
|---|---|
| Audit table inline or exportable? | **Both.** Inline per document, plus `.md` and `.csv` download including operator marks. |
| Where does PDF parsing happen? | **Client-side, pdf.js.** Keeps PDFs off the server entirely, stays under Vercel's 4.5 MB body limit, keeps the function's duration equal to the model call. |
| Who fills the audit table | **The app, mechanically — not the model, and not by hand.** Every row self-populates, and the Source check column is computed by string-matching the model's quote against the extracted page text. A self-graded table proves nothing; a computed one proves citation grounding without trusting the model at all. The optional Your review column covers the judgments a string match cannot make (PRD section 8). |

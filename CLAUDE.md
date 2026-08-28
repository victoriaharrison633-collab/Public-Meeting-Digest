# CLAUDE.md — Public Meeting Digest

Re-read this at the start of every session, along with `SPEC.md` and `BUILD-FAST.md`.

## What this is

Upload up to 5 published municipal meeting-minutes PDFs; get a per-document digest
plus an audit table that mechanically verifies every citation against the source text.
Single session, stateless, no accounts.

Building against **`BUILD-FAST.md`** (7 prompts, demo spine). `BUILD.md` is the full
15-prompt build and holds the deferred work. `SPEC.md` is the source of truth for
every value.

## Absent, not stubbed — generating any of these is a defect

| Absent | Means |
|---|---|
| **No database** | No Supabase, no Postgres, no migrations, no RLS. `src/lib/schema.ts` (Zod) is this app's shared foundation. |
| **No auth** | No `/api/auth/*`, no sessions, no lockout, no password policy, no user hooks. |
| **No payments** | No Stripe, no `PLANS`, no tiers, no webhooks, no billing. |
| **No file storage** | PDFs are parsed in the browser and never sent to the server. No upload route, no buckets. |
| **No persistence of user content** | No localStorage, sessionStorage, cookies, or IndexedDB anywhere. State is React state for the life of the tab. |

If a prompt seems to call for one of these, it is a misreading. Ask before building it.

## Ownership rules

- **`src/lib/constants.ts` owns every number and fixed enum.** No other file restates
  a limit. The model id is deliberately *not* there.
- **`src/lib/schema.ts` owns every data shape.** No `z.object` anywhere else.
- **`AI_MODEL` is the only place a model id may appear.** Never hardcode
  `claude-opus-5` in a source file.
- **`src/lib/env.ts` is the only reader of `process.env`** (plus `middleware.ts`,
  which runs in the edge runtime and cannot import it). ESLint enforces this.

## Fixed strings — byte-identical wherever they appear

Imported from `constants.ts`; never retyped.

- `DISCLAIMER` — "A reading aid, not the official record. Always verify against the published minutes."
- `UNCERTAIN_BADGE` — "Uncertain — verify against official record."
- `IMPACT_LABEL` — "What this may mean for residents"
- `NO_VOTE_TEXT` — "No vote recorded in source"

## Copy rules

Never describe the app's own output as "official", "authoritative", "certified", or
"verified". The one permitted use of "verified" is the source-check badge "Verified in
source", which describes a string match against the PDF — not a judgment that the
digest is correct. Never claim a certification the product does not hold.

## Non-negotiables in force

1. **Secrets in env only.** Server files start with `import 'server-only'`.
2. **Env validated at startup**, Zod, crash on missing.
4. **Paid-API controls.** The Claude call is metered: rate limit (in-memory here; the
   Anthropic Console spend cap is the real backstop), and no double-billing the same
   input.
5. **Generic client errors.** `{ error: string }` only. Stack traces, SDK text, and
   the model id go to the server log, never the browser.
7. **Zod on every input.** Every `request.json()` is `safeParse`d.
9. **No placeholder code.** No TODO, no console.log in routes, no mock data, no stubs.
10. **CSRF Origin check** on every mutating request against `NEXT_PUBLIC_APP_URL`.
14. **Model id from `AI_MODEL`**, logged once at startup, named error on a 404.
16. **Dev/prod separation.** Dev values in `.env.local` (gitignored); production
    values only in Vercel. `env.ts` refuses to boot in production against localhost.

Rules 3, 6, 8, 11, 12, 13, 15 concern databases, auth, webhooks and monetization —
inapplicable here and must not be simulated.

## The audit table is the point

The model never generates the audit table and never grades itself: a "match" written
by the same call that produced the digest verifies nothing. `buildAuditRows` is a pure
function, and the source check is a string match against the extracted page text. If
you are ever about to ask the model whether its own output was correct, stop.

## Pinned stack — exact, no `^`

Next 16.3.3 · React 19.2.8 · TypeScript 5.9.3 · @anthropic-ai/sdk 0.122.0 ·
pdfjs-dist 6.2.108 · zod 4.4.3 · tailwindcss 4.3.3 · eslint 9.39.5 · Vercel, Node
runtime (not Edge — the SDK and streaming need Node).

## Session discipline

One prompt per session. Run the checkpoint before moving on. Commit after each phase.

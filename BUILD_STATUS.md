# Build status — Public Meeting Digest

**Built against `BUILD-FAST.md`** (7-prompt demo spine). Started 12:28, deployed 13:53.

## Prompts

| # | Phase | Status | Actual |
|---|---|---|---|
| 1 | Setup, env & foundation | ✅ Checkpoint passed | 7 min |
| 2 | Schemas & types | ✅ Checkpoint passed | 6 min |
| 3 | PDF extraction & upload | ✅ Checkpoint passed (3 browser items outstanding) | 10 min |
| 4 | Digest API & system prompt | ✅ 7/8 — 502-on-bad-page not triggered at runtime | 34 min |
| 5 | Digest display | ✅ Checkpoint passed | 7 min |
| 6 | Audit table & source check | ✅ Checkpoint passed, canary verified | 8 min |
| 7 | Deploy & verify | ⚠️ Deployed; live verification blocked locally | — |

## Deployment

- **Live URL:** https://public-meeting-digest.vercel.app
- **Project:** `public-meeting-digest`, in the `DevFestDC` workspace (team slug still `miz-fit`)
- **Deployment:** `dpl_7yyMZzccm2hZM6ytiaBFU66G2sj5` — status Ready, target production
- **Aliases:** `public-meeting-digest.vercel.app`, `public-meeting-digest-miz-fit.vercel.app`
- **Env vars set (Production + Preview):** `ANTHROPIC_API_KEY`, `AI_MODEL=claude-opus-5`,
  `NEXT_PUBLIC_APP_URL=https://public-meeting-digest.vercel.app` (matches the alias, so
  the CSRF Origin check will pass)
- **Deployment Protection:** disabled by the operator, so the URL is public
- **Separate from** the `miz-fit` project, which shares only the workspace. Different
  domain, env vars, settings and deploy history.

## Verified

Against a local production build and a real model call:

- Security headers present; `unsafe-eval` correctly **absent** from the production CSP;
  no `x-powered-by`
- CSRF: missing Origin → 403, forged Origin → 403, valid Origin → passes to the route
- Digest on the fixture: 6 items, source order preserved, 6/6 rows verified by the
  mechanical source check
- Red-team cases: a voted-on prior-minutes approval classified **procedural**; a split
  3–2 vote matched exactly; a unanimous vote with no stated tally returned **null**
  counts rather than invented ones; a deferred item reported deferred, not decided
- Prompt injection planted in the document body was ignored and reported as content
- Audit canary: corrupting a `sourceQuote` turns the row **not_found** — the gate is
  proven able to fail
- Cost logging: ~$0.07 per document (4,043 in / 2,010 out on the fixture); cache hits
  log "no model call, no spend"

## Outstanding

### Blocked locally — needs a browser off this network
This machine sits behind **Cisco Umbrella**, which blocks `*.vercel.app` (403 from
`block.opendns.com`) and MITMs TLS (`SEC_E_UNTRUSTED_ROOT`). Live-URL verification could
not be run from the build machine.

- [ ] Load the live URL; confirm the disclaimer is visible without scrolling
- [ ] Upload a real PDF end-to-end on the deployed site
- [ ] Confirm `maxDuration = 300` applied (a document that takes 45s locally must not
      time out at ~10s in production)
- [ ] Rate limit: 11th request in 60s returns 429

### Needs the five real documents
- [ ] All five segment automatically — no zero-item results, no manual workaround
- [ ] The structurally-different document produces a coherent digest and an accurate
      `segmentationNote`
- [ ] Score the four eval axes per document: recall, precision, classification
      accuracy, impact-note groundedness
- [ ] Record every `not_found` row with its cause

### Deferred to `BUILD.md`
| Work | Prompt |
|---|---|
| Export audit table to `.md` / `.csv` | 10 |
| Privacy / terms / disclaimer pages | 11 |
| Polish: skeletons, error boundary, 404, responsive pass | 12 |
| Tests & CI | 13 |
| Replace the in-memory limiter with Upstash + spend ceiling | 2b |
| Sentry | 2a / 12 |

## Known gaps worth naming

- **Rate limiting is in-memory**, so it resets on cold start and is per-instance. The
  Anthropic Console spend cap is the real backstop on a public URL.
- **502-on-bad-page is unit-proven but never fired at runtime.** The model cited
  correctly even under a deliberate page-spoof attempt.
- **No automated tests yet.** Every verification so far was a one-off script, run and
  then deleted.

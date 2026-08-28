# PRD: Public Meeting Digest
**Status:** Draft for build | **Target build time:** 2–3 hours in Claude Code | **Interface:** Web app (Vercel, no database)

---

## Scoping note (read this first)

The 4-D template (Discover/Design/Develop/Deploy) is built for a persistent, multi-session AI product with drift monitoring, cost-at-scale modeling, and a mobile app. This build is a **single-session, stateless, multi-document-in / multi-digest-out tool**. Most 4-D categories collapse to "not applicable at this scope." I've kept all 11 sections so nothing falls through the cracks, but each is sized for a couple-hours build.

**The core fact that shapes everything below:** input and audit target are the *same document* — you upload official minutes PDFs; the AI produces a short digest per document; you audit each digest against its own source for completeness and faithfulness. This is an **extractive-and-inferential summarization + faithfulness-audit** problem, not a two-document reconciliation problem.

**Three things changed since the last draft:**
1. **No database.** Session is one-shot: upload PDFs, get digests, review, done. Nothing persists after the session. Vercel + serverless functions + the Claude API is the whole stack — Supabase is not needed unless a later version needs to save and retrieve digests across visits.
2. **Up to 5 documents, multiple formats, no manual fallback.** You'll test against up to 5 different municipalities' minutes in one session. Segmentation (F2) and decision-classification (F3) cannot assume a fixed template, and — this is now a hard requirement, not a risk to shrug off — **every document must process automatically.** There is no "flag it and skip" escape hatch for a document whose structure trips up segmentation. If F2 can't reliably hit that bar for all 5, that's the thing to fix before the demo, not around.
3. Both open questions from the prior draft are now closed (see below).

---

## 1. FAQs

**Q: Is this generating new information or just restructuring existing information?**
Mostly restructuring, with one exception: the resident impact note requires **inference** (plain-language "what this means for you"), not pure extraction. Everything else — decisions, votes, deferrals — must be traceable to the source text.

**Q: What happens if the PDF isn't actually meeting minutes (wrong file, scanned garbage, agenda-only doc)?**
Out of scope. Assume well-formed, text-extractable minutes PDFs.

**Q: Does this need to handle every municipality's minutes format?**
It needs to *not break* on different formats, since you're testing across municipalities — but there's no shared template to build against. The model infers structure per document rather than following a hardcoded parser. This is a real scope risk (see Risks) but is the actual requirement now, not a stretch goal.

**Q: Who is this for right now — is it a real product or a demo?**
A demo proving the mechanism works across a few real, differently-formatted transcripts. No auth, no storage, no history.

---

## 2. The Problem

Council and board meetings run 2–4 hours. Official minutes are long, procedurally formatted, and published days or weeks later. Residents who care about *one* agenda item have no fast way to find out what happened to it without reading the entire document.

**The gap this closes:** turning a long procedural record into a short, item-by-item "what happened and why it matters to you" digest, available as soon as minutes are published.

**Will this survive the next model upgrade?** Yes — long-document extraction plus faithful, grounded inference is a durable need. What improves with better models is how much human review the digest needs before publishing, not whether the task is worth doing. The audit step stays valuable as a guardrail regardless of model quality.

---

## 3. Jobs to Be Done & Personas

**Primary persona: The Time-Pressed Resident**
Job: "When a decision that affects my property/neighborhood/taxes happens, I want to know what was decided and what it means for me, without reading the full minutes."

**Secondary persona (this build): You, auditing the tool**
Job: "When I generate a digest from any given municipality's minutes, I want to verify it didn't drop a real decision, didn't invent one, and didn't miscall a procedural item as substantive (or vice versa) — before I'd trust the tool at all."

*Out of scope:* journalists, council staff, legal/compliance reviewers.

---

## 4. Use Cases

1. **Generate digests.** User uploads one or more minutes PDFs (different municipalities, different formats) in one session → app returns, per document, a list of items each with: decision made, vote record (if stated), deferred status (if applicable), and an inferred resident impact note.
2. **Audit each digest.** User reviews a **written audit table** per document, checking: every real decision appears (recall), nothing appears that isn't supported by the source (precision), vote counts match exactly, and the decision/procedural classification looks right.
3. *(Not in scope)* Saving digests, search/filter, subscriptions, multi-meeting history, export/share beyond the session.

---

## 5. Functional Requirements

- **F1 — Ingest:** Accept up to 5 PDF uploads in one session; extract text from each (text-layer PDFs only).
- **F2 — Item segmentation (format-agnostic, no fallback):** For each document independently, identify discrete agenda items using whatever structure that document actually has (headings, motion numbering, topic breaks) — no hardcoded template, since formats vary across municipalities. This must work automatically on all 5 documents; there is no manual-review-and-skip path for a document that doesn't fit an assumed shape. If a genuinely malformed document breaks this, treat it as a build bug to fix, not an expected edge case to route around.
- **F3 — Decision classification:** For each identified item, the model judges whether it's a **real decision** — something with tangible effect on people, process, or things (e.g., zoning changes, budget allocations, ordinances, contracts, appointments, permits) — versus **procedural noise** (approving prior minutes, roll call, adjournment, scheduling). This is a case-by-case judgment call, not a fixed rule list; the human audit (Use Case 2) is the intended check on borderline calls, so misjudgments here are expected and are exactly what the audit table surfaces.
- **F4 — Per-item extraction**, for each item classified as a real decision:
  - Decision made (or "no decision / deferred")
  - Vote record if stated (for/against/abstain counts; individual member votes if the source lists them)
  - Deferred/tabled status if applicable
  - Resident impact note — **inferred**, plain-language, 1–2 sentences. Inference is allowed and expected here (unlike F3/vote data, which must be strictly grounded), but the inference must be a reasonable plain-language restatement of the item's stated effect, not a speculative extension beyond what the source supports.
- **F5 — Confidence flagging:** If the model can't confidently determine the decision/vote for an item, output must say so explicitly ("Uncertain — verify against official record") rather than guessing.
- **F6 — Source grounding:** Each digest item references where it came from in the source (page number or quoted heading) so the audit table can verify it in seconds.
- **F7 — Written audit table:** For each document, produce a structured table: **Item | Digest says | Source says | Match? (Y/N/Partial) | Notes.** This is a demo deliverable, not just an internal build-time check — it's what you'll show as the "compare against official minutes" output.
- **F8 — Display:** Render digests and audit tables per document in the web app. No auth, no save, no cross-session state.

---

## 6. Non-Functional Requirements (right-sized)

| Category | Requirement for this build |
|---|---|
| Latency | Acceptable up to ~30–60s per document; batch job, not chat. Multiple documents can process sequentially or in parallel — either is fine for a demo. |
| Reliability | Best-effort; no uptime SLA. |
| Security | No auth needed. Don't persist uploaded PDFs beyond the session. No new PII exposure beyond what's already public in the minutes. |
| Compliance | None — public records are public, and per your call this is a demo with no legal-advice surface. UI copy should still avoid implying the digest is the official record. |
| Offline resilience | N/A — always-online web app. |
| Compatibility | Modern browsers only. |
| Scalability | N/A for this build — a handful of documents, one session. If this becomes a real product, revisit storage (Supabase) and multi-user concerns then, not now. |

---

## 7. AI Architecture & Evals

**Stack:** Vercel (hosting + serverless/edge functions) + Claude API. **No database** — state lives in the browser/session only, for as long as the tab is open. If you later want persistence, add Supabase then; don't build it preemptively.

**Model:** Strongest available model for this task. Accuracy matters more than cost at this stage (confirmed), and the task (cross-format structure inference + grounded extraction + bounded inference) benefits from more capability, not less.

**Context:** Full text of each minutes PDF in context, processed one document at a time even if multiple are uploaded in one session (don't blend documents into one context — they're unrelated meetings).

**System prompt — must include:**
- Role: "You are extracting and lightly inferring from a specific source document. You do not have a fixed template for this document's structure — infer it from what's actually there."
- Rule for F3: classify each item as decision-worthy or procedural based on real-world effect on people/process/things, not on whether a vote occurred (procedural items can have votes too, e.g., approving prior minutes).
- Rule for F4: vote counts, decision text, and deferral status must be strictly grounded in the source — no invention. The resident impact note is the one field allowed to infer beyond a direct quote, but it must stay tethered to what the item actually says.
- Constraint: if source is ambiguous on decision/vote, flag it (F5) rather than guess.
- Output format: structured (JSON per item) so the app can render digest + audit table consistently across differently-formatted source documents.

**Confidence threshold / authoritative vs. hedge:**
- The app never claims to be the official record.
- Per-item: state plainly when the source is clear; flag explicitly when it isn't. No legal-advice boundary applies here — the only boundary is factual-confidence, per your call.

**Eval criteria for the demo (now three axes instead of two, because of F3):**
- **Recall:** of real decisions/votes/deferrals actually in the source, what % did the digest catch?
- **Precision / hallucination rate:** of items in the digest, what % are unsupported by the source?
- **Classification accuracy:** of items the model labeled "real decision," how many do you agree are correctly classified vs. actually procedural (and vice versa — real decisions wrongly excluded)? This is new and important: it's the axis most likely to vary across differently-formatted municipalities.
- **Inference groundedness (impact notes):** spot-check whether each impact note is a reasonable restatement of the item's stated effect, or an unsupported leap.
- Score all four by hand, per document, in your audit table (F7). No automated eval tooling needed for this scope.

**Red-team / edge cases to test, across your different documents:**
- An item with a vote but no individually-listed member votes (does it invent them?).
- An item discussed at length but deferred with no vote (correctly "deferred," not "decided"?).
- A split/non-unanimous vote (exact count match?).
- A procedural item with a vote attached — e.g. approving prior minutes (correctly excluded from "real decisions" despite having a vote)?
- A borderline item (contract approval, committee appointment, small-scope variance) — does the model's judgment call feel defensible on review, even if you'd have called it differently?
- A document whose structure is meaningfully different from the others (does segmentation still work without a hardcoded template)?

---

## 8. Human-in-the-Loop

This product, at this stage, **is** the human-in-the-loop step. There's no automated publish path — the written audit table (F7) exists specifically so you review every digest against its source before trusting it. If this becomes real, that audit step should remain permanent, especially given F3's case-by-case judgment call is expected to be imperfect by design.

---

## 9. Risks

- **Format generalization risk (highest risk in this build):** with 5 municipalities, no shared template, and no fallback allowed, segmentation (F2) and classification (F3) are the most likely — and least forgiving — failure points. A prompt that works on document 1 may silently mis-segment document 4. Budget real time in Hour 1.5–2 to check all 5, not just the easiest one.
- **Decision/procedural misclassification:** F3 is inherently judgment-based; expect disagreements on borderline items. The audit table is the mitigation, not a guarantee of correctness.
- **Impact-note overreach:** since inference is now explicitly allowed (unlike votes/decisions), there's more surface area for a plausible-sounding but unsupported claim to slip through. Groundedness spot-checks in the eval are the mitigation.
- **Missed items (false negatives):** a real decision silently dropped is worse than one flagged uncertain, since nothing signals it happened. Weight recall over precision when in doubt.
- **Implied authority:** UI copy should make clear this is a reading aid, not the record of record.

---

## 10. Go-To-Market Milestones (scaled to this build)

1. **Hour 0–0.5:** Find 5 real published minutes PDFs from different municipalities. Confirm each has at least one clear decision, one recorded vote, and one deferred item. Deliberately include at least one document whose structure looks meaningfully different from the others — that's your real test of F2/F3, not the easy documents.
2. **Hour 0.5–1.5:** Build ingest (up to 5 files) + per-document segmentation/classification/extraction + digest generation in Claude Code; basic web UI to display results per document.
3. **Hour 1.5–2:** Generate the written audit table (F7) for all 5 documents; manually score against your four eval axes (Section 7). If any document fails to segment cleanly, this is the hour to fix the prompt/logic — not to drop the document.
4. **Hour 2–2.5:** Fix remaining gaps (missed items, bad classification calls, ungrounded impact notes) across all 5; polish UI enough to demo cleanly.
5. **Stretch:** Deploy live to Vercel instead of demoing from localhost.

No further GTM milestones apply at this scope.

---

## 11. Open Questions / Appendix: Metric Summary

**Resolved:**
- ~~How many documents~~ → **5 documents max**, locked in Section 1 and Section 10.
- ~~Manual fallback for hard-to-segment documents~~ → **No fallback.** Every document must process automatically (F2). Elevated to a hard requirement and the top risk in Section 9.

**Still open:**
- Do you want the audit table shown inline per-document in the UI, or generated as a separate exportable artifact (e.g., a downloadable table) for the demo?

**Metric summary (for this build only):**
| Metric | How measured |
|---|---|
| Recall on decisions/votes/deferrals | Manual count: found / actual, per document |
| Hallucination rate | Manual count: unsupported digest items / total digest items, per document |
| Vote-count exact-match rate | Manual count on items where source states tallies |
| Classification accuracy (decision vs. procedural) | Manual agreement/disagreement count on the model's F3 calls |
| Inference groundedness (impact notes) | Manual spot-check: reasonable restatement vs. unsupported leap |

Confidence-score distributions, overwrite rate, drift monitoring, and cost-at-scale (tokens × DAU × 30 days) remain **explicitly deferred** — this is a stateless single-session demo, not a live multi-user product. Revisit if this moves past demo stage, and revisit the "no database" decision at the same time.

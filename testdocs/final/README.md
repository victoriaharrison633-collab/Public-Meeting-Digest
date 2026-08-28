# Test document set

Five real, published municipal meeting minutes from five different states and five
different body types. This is the F2 test set: **every one must segment automatically.**
A document that fails is a bug to fix in `src/lib/prompt.ts`, not one to drop.

All five were verified text-layer extractable by running them through this project's own
`pdfjs` pipeline — not assumed.

| # | Body | Pages | Chars | Source |
|---|---|---|---|---|
| 1 | Memphis, TN — City Council, 3 Feb 2026 | 7 | 10,135 | [link](https://memphistn.gov/wp-content/uploads/2026/02/Minutes-02-03-2026.pdf) |
| 2 | Bloomington, IN — Common Council, 18 Feb 2026 | 3 | 6,063 | [link](https://bloomington.in.gov/onboard/meetingFiles/16441/download) |
| 3 | Campbell County, VA — Board of Supervisors, 2 Jun 2026 | 14 | 34,845 | [link](https://www.campbellcountyva.gov/AgendaCenter/ViewFile/Minutes/_06022026-700) |
| 4 | Holliston, MA — Zoning Board of Appeals, 22 Apr 2026 | 6 | 14,558 | [link](https://www.townofholliston.us/AgendaCenter/ViewFile/Minutes/_04222026-1026) |
| 5 | Chicopee, MA — ZBA Voting Record & Minutes, 8 Jul 2026 | 3 | 6,017 | [link](https://www.chicopeema.gov/AgendaCenter/ViewFile/Minutes/_07082026-2883) |

## Why each is here

1. **Memphis** — large-city council. Resolution-heavy, `MOTION:` / `SECOND:` convention,
   named member votes. The most "standard" of the five.
2. **Bloomington** — hierarchical numbering (`6.1 Ordinance 2026-06`). Carries the clean
   **split vote**: `Ayes: 2 (Asare, Zulich), Nays: 7 (Daily, Flaherty, …)`. Exact-count
   match is checkable here.
3. **Campbell County** — county board, long narrative minutes, 35k characters. Tests
   whether segmentation holds up over a document 6× longer than the shortest.
4. **Holliston** — carries the **deferral**: "the public hearing was continued to …".
   The test is whether the digest reports this as deferred rather than decided.
5. **Chicopee** — the **structurally different** one. A "Voting Record and Minutes"
   table rather than narrative prose. Its prior-minutes approval reads `Vote was 4-0`
   with **no individual members named**, which tests whether the model invents them.

## Red-team coverage (PRD §7)

| Case | Document |
|---|---|
| Split / non-unanimous vote, exact count | 2 Bloomington, 3 Campbell |
| Vote recorded with **no** individually-listed members | 5 Chicopee |
| Item deferred rather than decided | 4 Holliston |
| Procedural item that **carries a vote** (prior minutes) | 1, 2, 5 |
| Borderline decision/procedural calls | 3, 4 (variances, appointments) |
| Structure meaningfully unlike the others | 5 Chicopee |

## Rejected candidates, and why

- **Jerome, AZ P&Z** — matched on keywords and had a tabled item, but extraction showed
  it is an **AGENDA**, not minutes. Agenda-only documents are out of scope (PRD §1), so
  it would have tested the wrong thing.
- **Bridgeville, DE P&Z** — the URL returned a 244-byte error page; `pdfjs` threw
  `Invalid PDF structure`. Not a real document. (This is the input the app's
  `NoTextLayerError` path exists for.)

## Note

These are public records, republished here only so the eval set is reproducible.
Each links back to its issuing authority above, which remains the record of record.

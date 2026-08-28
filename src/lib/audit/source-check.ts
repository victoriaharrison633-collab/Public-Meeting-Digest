import { NEAR_MATCH_THRESHOLD } from "@/lib/constants";
import { normalize, words } from "./normalize";
import type { SourceCheck } from "@/types/digest";

/**
 * The mechanical grounding test — and the reason the audit table means anything.
 *
 * The model claims each item is quoted from a specific page. The browser already
 * extracted that page's real text. So we simply look for the quote in the page.
 * No model is involved in this judgment, which is exactly why it is trustworthy.
 *
 * A `not_found` is a fabricated or misattributed citation, caught with zero trust
 * in the model.
 */

/** Levenshtein similarity in [0,1], two-row DP. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }

  const distance = prev[b.length] ?? Math.max(a.length, b.length);
  return 1 - distance / Math.max(a.length, b.length);
}

/** At most this many equally-scoring windows get a full similarity comparison. */
const MAX_CANDIDATES = 12;

/**
 * Finds the windows of page text most likely to contain the quote, by sliding a
 * word window and scoring how many of the quote's words it contains.
 *
 * Scoring against the WHOLE page instead would be meaningless: a 200-character
 * quote inside a 4,000-character page always scores near zero.
 *
 * Returns ALL top-scoring windows rather than the first. When the quote differs
 * from the source by a word, the window shifted one position off ties with the
 * correctly aligned one — and picking the first produced a window missing the very
 * word that differs, scoring it as not_found. Comparing every tied candidate and
 * keeping the best removes that off-by-one entirely.
 */
function candidateWindows(
  quoteWords: string[],
  pageWords: string[],
): string[] {
  const k = quoteWords.length;
  if (k === 0 || pageWords.length === 0) return [];
  if (pageWords.length <= k) return [pageWords.join(" ")];

  const wanted = new Set(quoteWords);
  let bestScore = -1;
  let starts: number[] = [];

  for (let start = 0; start + k <= pageWords.length; start++) {
    let score = 0;
    for (let i = start; i < start + k; i++) {
      if (wanted.has(pageWords[i] ?? "")) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      starts = [start];
    } else if (score === bestScore && starts.length < MAX_CANDIDATES) {
      starts.push(start);
    }
  }

  return starts.map((s) => pageWords.slice(s, s + k).join(" "));
}

export function checkSource(quote: string, pageText: string): SourceCheck {
  const q = normalize(quote);
  const p = normalize(pageText);

  if (q.length === 0) return "not_found";

  // Fast path: the quote is verbatim, which is what we asked the model for.
  if (p.includes(q)) return "verified";

  const candidates = candidateWindows(words(q), words(p));
  if (candidates.length === 0) return "not_found";

  const best = candidates.reduce(
    (max, window) => Math.max(max, similarity(q, window)),
    0,
  );

  return best >= NEAR_MATCH_THRESHOLD ? "near" : "not_found";
}

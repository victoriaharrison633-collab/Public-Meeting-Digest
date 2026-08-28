/**
 * Text normalization for the source check.
 *
 * Getting this wrong is the single biggest source of false alarms. PDF extraction
 * routinely introduces artifacts the model's quote will not reproduce — words
 * hyphenated across line breaks, curly quotes, ligatures, ragged whitespace. A red
 * badge on a perfectly good citation destroys trust in the whole table, so
 * everything below is folded away before comparing.
 *
 * Comparison happens on the normalized forms; the ORIGINAL text is what gets
 * displayed.
 */

const LIGATURES: [RegExp, string][] = [
  [/ﬀ/g, "ff"],
  [/ﬁ/g, "fi"],
  [/ﬂ/g, "fl"],
  [/ﬃ/g, "ffi"],
  [/ﬄ/g, "ffl"],
  [/æ/g, "ae"],
  [/œ/g, "oe"],
];

export function normalize(text: string): string {
  let s = text;

  // Compose accents consistently before anything else.
  s = s.normalize("NFKC");

  // Rejoin words split across a line break: "re-\nzoning" -> "rezoning".
  s = s.replace(/[-‐‑]\s*\r?\n\s*/g, "");
  // Soft hyphens carry no meaning once the line wrapping is gone.
  s = s.replace(/­/g, "");

  // Curly quotes and primes -> ASCII.
  s = s.replace(/[‘’‚‛′]/g, "'");
  s = s.replace(/[“”„‟″]/g, '"');

  // Dashes -> hyphen. An en dash in a vote tally ("3–2") is extremely common.
  s = s.replace(/[‒–—―−]/g, "-");

  // Ellipsis and non-breaking spaces.
  s = s.replace(/…/g, "...");
  s = s.replace(/[     ]/g, " ");
  // Zero-width characters contribute nothing but break substring matching.
  s = s.replace(/[​‌‍﻿]/g, "");

  for (const [re, to] of LIGATURES) s = s.replace(re, to);

  s = s.toLowerCase();

  // All whitespace, including newlines, collapses to a single space.
  s = s.replace(/\s+/g, " ");

  return s.trim();
}

/** Normalized word list, used by the windowed search in source-check. */
export function words(normalized: string): string[] {
  return normalized.split(" ").filter(Boolean);
}

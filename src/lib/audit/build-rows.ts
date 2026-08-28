import { NO_VOTE_TEXT } from "@/lib/constants";
import { checkSource } from "./source-check";
import type {
  AuditRow,
  DigestItem,
  DigestResponse,
  Page,
  SourceCheck,
} from "@/types/digest";

/**
 * Builds the audit table from the digest and the extracted pages.
 *
 * PURE FUNCTION. No model call, no fetch. The model never generates this table and
 * never grades itself: a "match" written by the same call that produced the digest
 * verifies nothing, because a model that invented a decision will invent supporting
 * source text for it and mark the row correct.
 */

function formatDigestSays(item: DigestItem): string {
  const parts: string[] = [];

  parts.push(item.decision ?? "No decision recorded.");

  if (item.vote === null) {
    parts.push(NO_VOTE_TEXT + ".");
  } else {
    const counts: string[] = [];
    if (item.vote.for !== null) counts.push(`${item.vote.for} for`);
    if (item.vote.against !== null) counts.push(`${item.vote.against} against`);
    if (item.vote.abstain !== null) counts.push(`${item.vote.abstain} abstaining`);
    parts.push(
      counts.length > 0 ? `Vote: ${counts.join(", ")}.` : "Vote recorded.",
    );
    if (item.vote.memberVotes !== null && item.vote.memberVotes.length > 0) {
      parts.push(
        `Members: ${item.vote.memberVotes.map((m) => `${m.name} ${m.vote}`).join("; ")}.`,
      );
    }
  }

  if (item.deferred) {
    parts.push(`Deferred${item.deferralNote ? `: ${item.deferralNote}` : "."}`);
  }

  parts.push(`Classified ${item.classification}.`);

  if (item.confidence === "uncertain") {
    parts.push(`UNCERTAIN: ${item.uncertaintyReason ?? "reason not given"}`);
  }

  return parts.join(" ");
}

export function buildAuditRows(
  response: DigestResponse,
  pages: Page[],
): AuditRow[] {
  const byPage = new Map(pages.map((p) => [p.page, p.text]));

  // Every item gets a row, procedural included: procedural rows are what let a
  // reviewer catch a real decision wrongly filed as procedural.
  return response.items.map((item) => {
    const pageText = byPage.get(item.sourcePage);
    const sourceCheck: SourceCheck =
      pageText === undefined
        ? "not_found"
        : checkSource(item.sourceQuote, pageText);

    return {
      itemId: item.id,
      digestSays: formatDigestSays(item),
      sourceSays: `“${item.sourceQuote}” (p. ${item.sourcePage})`,
      sourceCheck,
      humanMatch: "" as const,
      humanNotes: "",
    };
  });
}

export interface Tally {
  verified: number;
  near: number;
  notFound: number;
  total: number;
}

export function tallyRows(rows: AuditRow[]): Tally {
  return {
    verified: rows.filter((r) => r.sourceCheck === "verified").length,
    near: rows.filter((r) => r.sourceCheck === "near").length,
    notFound: rows.filter((r) => r.sourceCheck === "not_found").length,
    total: rows.length,
  };
}

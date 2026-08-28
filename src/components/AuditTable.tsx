"use client";

import { useMemo, useState } from "react";
import { buildAuditRows, tallyRows } from "@/lib/audit/build-rows";
import { MATCH_VALUES } from "@/lib/constants";
import type {
  DigestItem,
  DigestResponse,
  MatchValue,
  Page,
  SourceCheck,
} from "@/types/digest";

const CHECK_LABEL: Record<SourceCheck, string> = {
  verified: "Verified in source",
  near: "Near match — check wording",
  not_found: "Not found in source",
};

const CHECK_CLASS: Record<SourceCheck, string> = {
  verified: "bg-verified-bg text-verified",
  near: "bg-near-bg text-near",
  not_found: "bg-notfound-bg text-notfound",
};

/** Colour is never the only signal — the label always shows, so the table
 *  survives a colourblind reader and a black-and-white screenshot. */
function SourceCheckBadge({ value }: { value: SourceCheck }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${CHECK_CLASS[value]}`}
    >
      {CHECK_LABEL[value]}
    </span>
  );
}

export function AuditTable({
  result,
  pages,
  items,
}: {
  result: DigestResponse;
  pages: Page[];
  items: DigestItem[];
}) {
  const rows = useMemo(() => buildAuditRows(result, pages), [result, pages]);
  const tally = useMemo(() => tallyRows(rows), [rows]);

  // Operator marks. React state only — never persisted, never sent to the server.
  const [marks, setMarks] = useState<Record<string, MatchValue>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const titleOf = (id: string) =>
    items.find((i) => i.id === id)?.title ?? "(untitled item)";

  if (rows.length === 0) {
    return (
      <div className="rounded border border-dashed border-line p-6 text-center">
        <p className="font-medium">No audit rows</p>
        <p className="mt-1 text-sm text-muted">
          This document produced no items, so there is nothing to check.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">
          {tally.verified + tally.near} of {tally.total} items verified against
          source text
          {tally.notFound > 0 && (
            <span className="text-notfound">
              {" "}
              · {tally.notFound} not found
            </span>
          )}
        </h3>
      </div>

      <p className="measure mt-1 text-xs text-muted">
        This check is mechanical: it confirms the quote really appears on the cited
        page. It does <strong>not</strong> confirm the quote supports the claim, and
        it cannot detect a decision the model missed entirely — a dropped item has no
        row. Read the source for that.
      </p>

      {/* The table scrolls inside its own container; the page never scrolls sideways. */}
      <div className="mt-3 overflow-x-auto rounded border border-line">
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead className="bg-neutral-50 text-left">
            <tr>
              <th className="border-b border-line px-3 py-2 font-medium">Item</th>
              <th className="border-b border-line px-3 py-2 font-medium">
                Digest says
              </th>
              <th className="border-b border-line px-3 py-2 font-medium">
                Source says
              </th>
              <th className="border-b border-line px-3 py-2 font-medium">
                Source check
              </th>
              <th className="border-b border-line px-3 py-2 font-medium">
                Your review
              </th>
              <th className="border-b border-line px-3 py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.itemId} className="align-top">
                <td className="border-b border-line px-3 py-2 font-medium">
                  {titleOf(row.itemId)}
                </td>
                <td className="border-b border-line px-3 py-2">{row.digestSays}</td>
                <td className="border-b border-line px-3 py-2 text-muted italic">
                  {row.sourceSays}
                </td>
                <td className="border-b border-line px-3 py-2">
                  <SourceCheckBadge value={row.sourceCheck} />
                </td>
                <td className="border-b border-line px-3 py-2">
                  <select
                    value={marks[row.itemId] ?? ""}
                    onChange={(e) =>
                      setMarks((m) => ({
                        ...m,
                        [row.itemId]: e.target.value as MatchValue,
                      }))
                    }
                    aria-label={`Your review of ${titleOf(row.itemId)}`}
                    className="rounded border border-line bg-white px-2 py-1 text-sm"
                  >
                    {MATCH_VALUES.map((v) => (
                      <option key={v || "unreviewed"} value={v}>
                        {v === "" ? "—" : v}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-line px-3 py-2">
                  <input
                    type="text"
                    value={notes[row.itemId] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [row.itemId]: e.target.value }))
                    }
                    aria-label={`Notes on ${titleOf(row.itemId)}`}
                    placeholder="—"
                    className="w-40 rounded border border-line bg-white px-2 py-1 text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

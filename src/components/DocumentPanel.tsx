"use client";

import { useState } from "react";
import { DigestCard } from "@/components/DigestCard";
import type { SessionDoc } from "@/types/digest";

/**
 * One panel per document. Panels stack vertically — no tabs, because the operator
 * compares documents by scrolling, not by clicking between them.
 */
export function DocumentPanel({
  doc,
  onRetry,
}: {
  doc: SessionDoc;
  onRetry: (id: string) => void;
}) {
  const [showNote, setShowNote] = useState(false);

  return (
    <section className="rounded border border-line bg-white">
      <header className="border-b border-line px-4 py-3">
        <h2 className="font-semibold">{doc.filename}</h2>
        <p className="text-xs text-muted">
          {doc.pages.length} page{doc.pages.length === 1 ? "" : "s"}
        </p>
      </header>

      {doc.status === "processing" && (
        <div className="px-4 py-6">
          <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-200" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-neutral-200" />
          <p className="mt-3 text-sm text-muted">
            Analysing this document. This usually takes 20–60 seconds.
          </p>
        </div>
      )}

      {doc.status === "error" && (
        <div className="px-4 py-5">
          <p className="rounded border border-notfound bg-notfound-bg px-3 py-2 text-sm text-notfound">
            {doc.error}
          </p>
          <button
            type="button"
            onClick={() => onRetry(doc.id)}
            className="mt-3 rounded border border-line bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
          >
            Retry this document
          </button>
        </div>
      )}

      {doc.status === "done" && doc.result && (
        <div className="px-4 py-4">
          <p className="measure text-sm">{doc.result.documentSummary}</p>

          <button
            type="button"
            onClick={() => setShowNote((v) => !v)}
            className="mt-2 text-xs font-medium text-accent underline"
            aria-expanded={showNote}
          >
            {showNote ? "Hide" : "How this document was read"}
          </button>
          {showNote && (
            <p className="measure mt-1 rounded bg-neutral-50 px-3 py-2 text-xs text-muted">
              {doc.result.segmentationNote}
            </p>
          )}

          <p className="mt-3 text-xs text-muted">
            {doc.result.items.filter((i) => i.classification === "decision").length}{" "}
            decision(s) ·{" "}
            {doc.result.items.filter((i) => i.classification === "procedural").length}{" "}
            procedural · shown in source order
          </p>

          {doc.result.items.length === 0 ? (
            <div className="mt-3 rounded border border-dashed border-line p-6 text-center">
              <p className="font-medium">No agenda items identified</p>
              <p className="measure mx-auto mt-1 text-sm text-muted">
                This is a reportable outcome, not necessarily a bug — check the
                source and the note above before trusting it.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {doc.result.items.map((item) => (
                <DigestCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

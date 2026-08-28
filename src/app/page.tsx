"use client";

import { DocumentPanel } from "@/components/DocumentPanel";
import { UploadZone } from "@/components/UploadZone";
import { useDocuments } from "@/hooks/useDocuments";
import { DISCLAIMER } from "@/lib/constants";

export default function Home() {
  const { docs, notice, atCapacity, addFiles, retry, remove } = useDocuments();

  // A document earns a panel once it has been sent for analysis.
  const active = docs.filter(
    (d) => d.status === "processing" || d.status === "done" || (d.status === "error" && d.pages.length > 0),
  );
  const pending = docs.filter((d) => d.status === "processing").length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Public Meeting Digest
        </h1>
        <p className="measure mt-2 text-muted">
          Drop published meeting-minutes PDFs and get a short, item-by-item digest
          with an audit table that checks every citation against the source.
        </p>
        <p className="mt-4 rounded border border-line bg-white px-3 py-2 text-sm">
          {DISCLAIMER}
        </p>
      </header>

      <section className="mt-8">
        <UploadZone
          docs={docs}
          notice={notice}
          atCapacity={atCapacity}
          onAdd={addFiles}
          onRetry={retry}
          onRemove={remove}
        />
      </section>

      <section className="mt-8">
        {active.length === 0 ? (
          <div className="rounded border border-dashed border-line p-10 text-center">
            <h2 className="font-medium">No documents yet</h2>
            <p className="measure mx-auto mt-1 text-sm text-muted">
              Add up to 5 text-layer PDFs above. Nothing is uploaded or stored.
            </p>
          </div>
        ) : (
          <>
            {pending > 0 && (
              <p className="mb-3 text-sm text-muted" role="status">
                {pending} document{pending === 1 ? "" : "s"} still being analysed —
                one at a time, so the queue is steady rather than fast.
              </p>
            )}
            <div className="space-y-6">
              {active.map((doc) => (
                <DocumentPanel key={doc.id} doc={doc} onRetry={retry} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

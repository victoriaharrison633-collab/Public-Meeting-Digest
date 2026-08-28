"use client";

import { UploadZone } from "@/components/UploadZone";
import { useDocuments } from "@/hooks/useDocuments";
import { DISCLAIMER } from "@/lib/constants";

export default function Home() {
  const { docs, notice, atCapacity, addFiles, retry, remove } = useDocuments();

  const extracted = docs.filter((d) => d.pages.length > 0);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="border-b border-[--color-line] pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Public Meeting Digest
        </h1>
        <p className="measure mt-2 text-[--color-muted]">
          Drop published meeting-minutes PDFs and get a short, item-by-item digest
          with an audit table that checks every citation against the source.
        </p>
        <p className="mt-4 rounded border border-[--color-line] bg-white px-3 py-2 text-sm">
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
        {extracted.length === 0 ? (
          <div className="rounded border border-dashed border-[--color-line] p-10 text-center">
            <h2 className="font-medium">No documents yet</h2>
            <p className="measure mx-auto mt-1 text-sm text-[--color-muted]">
              Add up to 5 text-layer PDFs above. Nothing is uploaded or stored.
            </p>
          </div>
        ) : (
          <div className="rounded border border-[--color-line] p-6">
            <h2 className="font-medium">
              {extracted.length} document{extracted.length === 1 ? "" : "s"} ready
            </h2>
            <p className="measure mt-1 text-sm text-[--color-muted]">
              Digest generation is wired in Prompt 4. Extracted page counts are
              shown above.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

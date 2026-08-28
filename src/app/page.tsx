import { DISCLAIMER } from "@/lib/constants";

// Prompt 3 replaces the upload region and Prompt 5 the results region.
export default function Home() {
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
        <div className="rounded border border-dashed border-[--color-line] p-10 text-center">
          <h2 className="font-medium">No documents yet</h2>
          <p className="measure mx-auto mt-1 text-sm text-[--color-muted]">
            Upload arrives in Prompt 3. Up to 5 text-layer PDFs at once; nothing is
            uploaded or stored.
          </p>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useRef, useState } from "react";
import { MAX_DOCUMENTS } from "@/lib/constants";
import type { SessionDoc } from "@/types/digest";

const STATUS_LABEL: Record<SessionDoc["status"], string> = {
  queued: "Ready",
  extracting: "Reading PDF…",
  processing: "Analysing…",
  done: "Done",
  error: "Failed",
};

const STATUS_CLASS: Record<SessionDoc["status"], string> = {
  queued: "bg-[--color-verified-bg] text-[--color-verified]",
  extracting: "bg-neutral-100 text-neutral-600",
  processing: "bg-[--color-near-bg] text-[--color-near]",
  done: "bg-[--color-verified-bg] text-[--color-verified]",
  error: "bg-[--color-notfound-bg] text-[--color-notfound]",
};

interface Props {
  docs: SessionDoc[];
  notice: string | null;
  atCapacity: boolean;
  onAdd: (files: File[]) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

export function UploadZone({
  docs,
  notice,
  atCapacity,
  onAdd,
  onRetry,
  onRemove,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (atCapacity) return;
    onAdd(Array.from(e.dataTransfer.files));
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!atCapacity) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded border-2 border-dashed p-8 text-center transition-colors ${
          atCapacity
            ? "border-[--color-line] bg-neutral-50 opacity-60"
            : dragging
              ? "border-[--color-accent] bg-blue-50/40"
              : "border-[--color-line]"
        }`}
      >
        <p className="font-medium">
          {atCapacity
            ? `${MAX_DOCUMENTS} documents added — that's the limit`
            : "Drop meeting-minutes PDFs here"}
        </p>
        <p className="mt-1 text-sm text-[--color-muted]">
          Up to {MAX_DOCUMENTS} text-layer PDFs. They are read in your browser and
          never uploaded.
        </p>
        <button
          type="button"
          disabled={atCapacity}
          onClick={() => input.current?.click()}
          className="mt-4 rounded border border-[--color-line] bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Choose files
        </button>
        <input
          ref={input}
          type="file"
          accept="application/pdf"
          multiple
          hidden
          onChange={(e) => {
            onAdd(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {notice && (
        <p
          role="status"
          className="mt-3 rounded border border-[--color-notfound] bg-[--color-notfound-bg] px-3 py-2 text-sm text-[--color-notfound]"
        >
          {notice}
        </p>
      )}

      {docs.length > 0 && (
        <ul className="mt-4 divide-y divide-[--color-line] rounded border border-[--color-line]">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.filename}</p>
                <p className="text-xs text-[--color-muted]">
                  {doc.pages.length > 0
                    ? `${doc.pages.length} page${doc.pages.length === 1 ? "" : "s"} extracted`
                    : doc.error
                      ? doc.error
                      : "—"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[doc.status]}`}
              >
                {STATUS_LABEL[doc.status]}
              </span>
              {doc.status === "error" && (
                <button
                  type="button"
                  onClick={() => onRetry(doc.id)}
                  className="shrink-0 text-xs font-medium text-[--color-accent] underline"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemove(doc.id)}
                aria-label={`Remove ${doc.filename}`}
                className="shrink-0 text-xs text-[--color-muted] hover:text-[--color-ink]"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

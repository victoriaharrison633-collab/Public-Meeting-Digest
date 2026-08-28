"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extractPages, NoTextLayerError } from "@/lib/pdf/extract";
import {
  MAX_DOCUMENTS,
  MAX_EXTRACTED_CHARS,
  MAX_PDF_BYTES,
} from "@/lib/constants";
import type { SessionDoc } from "@/types/digest";

/**
 * Owns the session's documents and their status machine:
 *   queued -> extracting -> queued (extracted) -> processing -> done | error
 *
 * State lives here and in React only. Nothing is written to localStorage,
 * sessionStorage, cookies or IndexedDB anywhere in this app.
 */

export interface UseDocuments {
  docs: SessionDoc[];
  notice: string | null;
  addFiles: (files: File[]) => void;
  retry: (id: string) => void;
  remove: (id: string) => void;
  clearNotice: () => void;
  atCapacity: boolean;
}

const mb = (bytes: number) => `${Math.round(bytes / 1_048_576)} MB`;

export function useDocuments(): UseDocuments {
  const [docs, setDocs] = useState<SessionDoc[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  // Mirror of `docs` so addFiles can read the current count without doing work
  // inside a setState updater (React may invoke those twice in development).
  const docsRef = useRef<SessionDoc[]>([]);
  useEffect(() => {
    docsRef.current = docs;
  }, [docs]);

  /**
   * File handles for retry, held outside React state so a File object is never
   * serialized into the render tree. Cleared on remove; gone when the tab closes.
   */
  const files = useRef(new Map<string, File>());

  // Extraction runs one document at a time. Five concurrent pdf.js workers jank
  // the main thread badly enough to look like a crash during a demo.
  const queue = useRef<Promise<void>>(Promise.resolve());

  const update = useCallback((id: string, patch: Partial<SessionDoc>) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  const runExtraction = useCallback(
    (id: string, file: File) => {
      queue.current = queue.current.then(async () => {
        update(id, { status: "extracting", error: null });
        try {
          const pages = await extractPages(file);
          const chars = pages.reduce((n, p) => n + p.text.length, 0);
          if (chars > MAX_EXTRACTED_CHARS) {
            update(id, {
              status: "error",
              error: `Document is too long (${chars.toLocaleString()} characters; limit ${MAX_EXTRACTED_CHARS.toLocaleString()}).`,
            });
            return;
          }
          update(id, { status: "queued", pages, error: null });
        } catch (err) {
          update(id, {
            status: "error",
            error:
              err instanceof NoTextLayerError
                ? err.message
                : "Could not read this PDF. It may be corrupt or password-protected.",
          });
        }
      });
    },
    [update],
  );

  const addFiles = useCallback(
    (incoming: File[]) => {
      const room = MAX_DOCUMENTS - docsRef.current.length;
      if (room <= 0) {
        setNotice(`You can process ${MAX_DOCUMENTS} documents at a time.`);
        return;
      }

      const problems: string[] = [];
      const accepted: SessionDoc[] = [];

      for (const file of incoming) {
        if (accepted.length >= room) {
          problems.push(
            `Only ${MAX_DOCUMENTS} documents at a time — "${file.name}" was not added.`,
          );
          continue;
        }
        if (file.type !== "application/pdf") {
          problems.push(`"${file.name}" is not a PDF.`);
          continue;
        }
        if (file.size > MAX_PDF_BYTES) {
          problems.push(
            `"${file.name}" is ${mb(file.size)}; the limit is ${mb(MAX_PDF_BYTES)}.`,
          );
          continue;
        }
        const doc: SessionDoc = {
          id: crypto.randomUUID(),
          filename: file.name,
          pages: [],
          status: "queued",
          error: null,
          result: null,
        };
        files.current.set(doc.id, file);
        accepted.push(doc);
      }

      setNotice(problems.length > 0 ? problems.join(" ") : null);

      if (accepted.length > 0) {
        docsRef.current = [...docsRef.current, ...accepted];
        setDocs(docsRef.current);
        for (const doc of accepted) {
          const file = files.current.get(doc.id);
          if (file) runExtraction(doc.id, file);
        }
      }
    },
    [runExtraction],
  );

  const retry = useCallback(
    (id: string) => {
      const file = files.current.get(id);
      if (file) runExtraction(id, file);
    },
    [runExtraction],
  );

  const remove = useCallback((id: string) => {
    files.current.delete(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  return {
    docs,
    notice,
    addFiles,
    retry,
    remove,
    clearNotice,
    atCapacity: docs.length >= MAX_DOCUMENTS,
  };
}

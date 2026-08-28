"use client";

import type { Page } from "@/types/digest";

/**
 * Browser-side PDF text extraction.
 *
 * The PDF file never leaves the browser — there is no upload route to send it to,
 * and that is deliberate (SPEC.md "Architecture"). Only the extracted text is ever
 * POSTed.
 *
 * The page number produced here is the citation anchor the entire audit table
 * depends on. An off-by-one silently turns every source check red, so pages are
 * 1-indexed to match what a reader sees in a PDF viewer.
 */

export class NoTextLayerError extends Error {
  constructor(filename: string) {
    super(
      `"${filename}" has no extractable text layer. It is probably a scanned image. ` +
        `Scanned PDFs are out of scope — try a text-based copy of the minutes.`,
    );
    this.name = "NoTextLayerError";
  }
}

/** Below this many characters across the whole document, treat it as scanned. */
const MIN_TEXT_CHARS = 200;

interface TextItemLike {
  str: string;
  hasEOL?: boolean;
}

function isTextItem(item: unknown): item is TextItemLike {
  return typeof item === "object" && item !== null && "str" in item;
}

export async function extractPages(file: File): Promise<Page[]> {
  // Imported lazily: pdf.js touches browser globals and must not be pulled into
  // any server bundle.
  const pdfjs = await import("pdfjs-dist");

  // Served from /public by the postinstall script. Never a CDN — the CSP blocks
  // cross-origin workers, and a version mismatch fails silently with empty text.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  // Hold the loading task: `destroy()` lives on the task, not the document proxy.
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const doc = await task.promise;

  const pages: Page[] = [];
  let totalChars = 0;

  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();

      let text = "";
      for (const item of content.items) {
        if (!isTextItem(item)) continue;
        text += item.str;
        // Preserve line breaks: minutes rely on line structure for headings and
        // motion numbering, which is what segmentation reads.
        text += item.hasEOL ? "\n" : " ";
      }

      const cleaned = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      totalChars += cleaned.length;
      pages.push({ page: n, text: cleaned });

      page.cleanup();
    }
  } finally {
    await task.destroy();
  }

  if (totalChars < MIN_TEXT_CHARS) {
    throw new NoTextLayerError(file.name);
  }

  return pages;
}

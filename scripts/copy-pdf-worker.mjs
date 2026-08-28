// Copies the pdf.js worker out of node_modules into public/ so the worker version
// can never drift from the pdfjs-dist version. A mismatch fails silently at runtime
// with an empty text layer, which looks exactly like a scanned PDF.
import { copyFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const buildDir = join(root, "node_modules", "pdfjs-dist", "build");
const publicDir = join(root, "public");

if (!existsSync(buildDir)) {
  console.warn("[copy-pdf-worker] pdfjs-dist not installed yet; skipping.");
  process.exit(0);
}

const worker = readdirSync(buildDir).find(
  (f) => /^pdf\.worker(\.min)?\.mjs$/.test(f),
);

if (!worker) {
  console.error(
    `[copy-pdf-worker] No pdf.worker*.mjs found in ${buildDir}. Contents: ${readdirSync(buildDir).join(", ")}`,
  );
  process.exit(1);
}

mkdirSync(publicDir, { recursive: true });
copyFileSync(join(buildDir, worker), join(publicDir, "pdf.worker.min.mjs"));
console.log(`[copy-pdf-worker] Copied ${worker} -> public/pdf.worker.min.mjs`);

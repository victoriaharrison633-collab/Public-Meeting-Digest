/**
 * Server-side logging. Detail goes here; the browser only ever gets a generic
 * message (Rule 5). Redacts anything key-shaped before writing.
 */

const KEY_SHAPES = [
  /sk-ant-[A-Za-z0-9_-]{8,}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /Bearer\s+[A-Za-z0-9._-]{16,}/gi,
];

function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return KEY_SHAPES.reduce((s, re) => s.replace(re, "[redacted]"), value);
  }
  if (value instanceof Error) {
    return { name: value.name, message: redact(value.message) };
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, redact(v)]),
    );
  }
  return value;
}

export const logger = {
  info: (msg: string, meta?: unknown) =>
    console.log(`[info] ${msg}`, meta === undefined ? "" : redact(meta)),
  warn: (msg: string, meta?: unknown) =>
    console.warn(`[warn] ${msg}`, meta === undefined ? "" : redact(meta)),
  error: (msg: string, meta?: unknown) =>
    console.error(`[error] ${msg}`, meta === undefined ? "" : redact(meta)),
};

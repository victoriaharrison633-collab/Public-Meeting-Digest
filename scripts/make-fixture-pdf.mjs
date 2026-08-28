// Generates fixtures/sample-minutes.pdf — a small two-page text-layer PDF used to
// exercise extraction without needing a real municipal document. Not a substitute
// for the five real documents; those are what actually test segmentation.
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const PAGES = [
  [
    "CITY OF EXAMPLETON",
    "REGULAR COUNCIL MEETING - MINUTES",
    "Tuesday, 12 March 2024, 7:00 p.m.",
    "",
    "1. CALL TO ORDER AND ROLL CALL",
    "Present: Mayor Ruiz, Councillors Okafor, Lindqvist, Barros, Nakamura.",
    "",
    "2. APPROVAL OF MINUTES OF 27 FEBRUARY 2024",
    "Moved by Councillor Okafor, seconded by Councillor Barros.",
    "CARRIED unanimously (5-0).",
    "",
    "3. ZONING AMENDMENT ZA-2024-011, 14 ELM STREET",
    "Application to rezone from R1 to R3 to permit eight townhouse units.",
    "Moved by Councillor Lindqvist that the amendment be approved.",
    "CARRIED (3-2). In favour: Lindqvist, Nakamura, Ruiz.",
    "Opposed: Okafor, Barros.",
  ],
  [
    "4. AWARD OF CONTRACT - WINTER ROAD MAINTENANCE",
    "Three bids received. Staff recommend the low bid of $412,000.",
    "Moved by Councillor Nakamura that the contract be awarded as recommended.",
    "CARRIED unanimously.",
    "",
    "5. PROPOSED STORMWATER UTILITY FEE",
    "Following discussion, Council requested further financial analysis.",
    "Item DEFERRED to the meeting of 9 April 2024. No vote taken.",
    "",
    "6. ADJOURNMENT",
    "Moved by Councillor Barros. CARRIED. Meeting adjourned at 9:14 p.m.",
  ],
];

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

function contentStream(lines) {
  const body = lines
    .map((line, i) =>
      i === 0
        ? `BT /F1 11 Tf 14 TL 72 720 Td (${esc(line)}) Tj`
        : `T* (${esc(line)}) Tj`,
    )
    .join("\n");
  return `${body}\nET\n`;
}

const objects = [];
objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
objects[2] = `<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>`;

const streams = PAGES.map(contentStream);
objects[3] =
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 7 0 R >> >> >>";
objects[4] = `<< /Length ${Buffer.byteLength(streams[0])} >>\nstream\n${streams[0]}endstream`;
objects[5] =
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >>";
objects[6] = `<< /Length ${Buffer.byteLength(streams[1])} >>\nstream\n${streams[1]}endstream`;
objects[7] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

let pdf = "%PDF-1.4\n";
const offsets = [];
for (let i = 1; i < objects.length; i++) {
  offsets[i] = Buffer.byteLength(pdf);
  pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
}

const xrefOffset = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
for (let i = 1; i < objects.length; i++) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

mkdirSync(join(root, "fixtures"), { recursive: true });
writeFileSync(join(root, "fixtures", "sample-minutes.pdf"), pdf, "latin1");
console.log("Wrote fixtures/sample-minutes.pdf (2 pages)");

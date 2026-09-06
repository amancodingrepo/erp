function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildSimplePdf(lines: string[]): Uint8Array {
  const rows = lines.filter(Boolean);
  const content = rows
    .map((line, i) => `BT /F1 12 Tf 50 ${760 - i * 20} Td (${pdfEscape(line)}) Tj ET`)
    .join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  const header = "%PDF-1.4\n";
  const xref: number[] = [0];
  let body = "";
  for (const obj of objects) {
    xref.push(Buffer.byteLength(header + body, "utf8"));
    body += `${obj}\n`;
  }
  const xrefStart = Buffer.byteLength(header + body, "utf8");
  const xrefTable = `xref\n0 ${xref.length}\n${xref
    .map((n, i) =>
      i === 0 ? "0000000000 65535 f \n" : `${String(n).padStart(10, "0")} 00000 n \n`,
    )
    .join("")}`;
  const trailer = `trailer << /Size ${xref.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Uint8Array(Buffer.from(header + body + xrefTable + trailer, "utf8"));
}

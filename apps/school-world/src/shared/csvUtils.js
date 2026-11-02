/**
 * Small shared CSV helpers used by the student directory, fee tools, and contacts.
 * Keeps quoting, BOM handling, line endings, and download cleanup consistent.
 */
export function parseCsvRows(source) {
  const text = String(source ?? "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(cell => String(cell).trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("The CSV has an opening quote without a matching closing quote.");
  if (field.length || row.length) {
    row.push(field);
    if (row.some(cell => String(cell).trim() !== "")) rows.push(row);
  }
  return rows;
}

export function downloadCsvFile(filename, rows) {
  const csv = rows.map(row => row.map(value => '"' + String(value ?? "").replaceAll('"', '""') + '"').join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

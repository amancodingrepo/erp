import { ADMISSION_FIELD_GROUPS } from "./admissionFormCatalog.js";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 38;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_BOTTOM = PAGE_HEIGHT - 45;

function pdfSafeText(value) {
  return String(value ?? "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•·]/g, "-")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(value, maxChars) {
  const words = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if ((line + " " + word).length <= maxChars) line += " " + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function safeFilename(value) {
  return String(value || "admission-form")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "admission-form";
}

function getPrintableGroups(form, formType) {
  return (form?.fields || []).map(selection => {
    const group = ADMISSION_FIELD_GROUPS.find(item => item.id === selection.groupId);
    if (!group) return null;
    if (group.kind === "photo") return { ...group, printableFields: [] };
    const printableFields = (group.fields || []).filter(field => {
      const requirement = selection.settings?.[field.id]?.[formType]
        || field[formType === "admission" ? "defaultAdmission" : "defaultEnquiry"]
        || "Optional";
      return requirement !== "Not Required";
    }).map(field => ({
      ...field,
      required: (selection.settings?.[field.id]?.[formType]
        || field[formType === "admission" ? "defaultAdmission" : "defaultEnquiry"]
        || "Optional") === "Required"
    }));
    if (!printableFields.length) return null;
    return { ...group, printableFields };
  }).filter(Boolean);
}

function makePdfPages(pageContents) {
  const objects = [];
  const pageObjectIds = pageContents.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [" + pageObjectIds.map(id => id + " 0 R").join(" ") + "] /Count " + pageObjectIds.length + " >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  pageContents.forEach((stream, index) => {
    const pageId = pageObjectIds[index];
    const streamId = pageId + 1;
    objects[pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PAGE_WIDTH + " " + PAGE_HEIGHT + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + streamId + " 0 R >>";
    objects[streamId] = "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream";
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += id + " 0 obj\n" + objects[id] + "\nendobj\n";
  }
  const xrefOffset = pdf.length;
  pdf += "xref\n0 " + objects.length + "\n0000000000 65535 f \n";
  for (let id = 1; id < objects.length; id += 1) {
    pdf += String(offsets[id]).padStart(10, "0") + " 00000 n \n";
  }
  pdf += "trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
  return pdf;
}

export function downloadPrintableAdmissionFormPdf({
  form,
  formType = "enquiry",
  titleOverride = "",
  termsAndConditions = ""
}) {
  const title = titleOverride || form?.name || "Admission Form";
  const typeLabel = formType === "admission" ? "ADMISSION" : "ENQUIRY";
  const academicYear = form?.academicYear || "";
  const sections = getPrintableGroups(form, formType);
  if (!sections.length) {
    throw new Error("Add at least one field group before downloading the printable form.");
  }

  const pages = [];
  let commands = [];
  let y = 0;
  let pageNumber = 0;

  const addText = (value, x, top, size = 9, bold = false, color = "0.12 0.18 0.25") => {
    const baseline = PAGE_HEIGHT - top - size;
    commands.push(color + " rg BT /" + (bold ? "F2" : "F1") + " " + size + " Tf " + x.toFixed(2) + " " + baseline.toFixed(2) + " Td (" + pdfSafeText(value) + ") Tj ET");
  };
  const addLine = (x1, top1, x2, top2, color = "0.68 0.73 0.79", width = 0.6) => {
    commands.push(color + " RG " + width + " w " + x1.toFixed(2) + " " + (PAGE_HEIGHT - top1).toFixed(2) + " m " + x2.toFixed(2) + " " + (PAGE_HEIGHT - top2).toFixed(2) + " l S");
  };
  const addRect = (x, top, width, height, color = "0.68 0.73 0.79", lineWidth = 0.7) => {
    commands.push(color + " RG " + lineWidth + " w " + x.toFixed(2) + " " + (PAGE_HEIGHT - top - height).toFixed(2) + " " + width.toFixed(2) + " " + height.toFixed(2) + " re S");
  };
  const finalizePage = () => {
    addLine(MARGIN, PAGE_HEIGHT - 31, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 31, "0.78 0.81 0.85", 0.5);
    addText("Page " + pageNumber, PAGE_WIDTH - MARGIN - 33, PAGE_HEIGHT - 25, 7, false, "0.38 0.43 0.49");
    pages.push(commands.join("\n"));
  };
  const startPage = () => {
    if (pageNumber > 0) finalizePage();
    pageNumber += 1;
    commands = [];
    const continued = pageNumber > 1 ? " (continued)" : "";
    addText(title + continued, MARGIN, 29, pageNumber === 1 ? 15 : 11, true, "0.08 0.14 0.22");
    addText(typeLabel + " FORM", MARGIN, 51, 8, true, "0.28 0.34 0.42");
    if (academicYear) addText("Academic Year: " + academicYear, PAGE_WIDTH - MARGIN - 112, 51, 8, false, "0.28 0.34 0.42");
    addLine(MARGIN, 67, PAGE_WIDTH - MARGIN, 67, "0.42 0.48 0.56", 0.8);
    if (pageNumber === 1) {
      addText("Please write clearly in BLOCK LETTERS. Fields marked * are required.", MARGIN, 75, 8, false, "0.32 0.37 0.43");
      y = 96;
    } else {
      y = 80;
    }
  };
  const ensureSpace = (height) => {
    if (y + height > CONTENT_BOTTOM) startPage();
  };
  const drawSectionHeading = (label, description = "") => {
    ensureSpace(90);
    addText(label, MARGIN, y + 5, 10, true, "0.12 0.20 0.30");
    addLine(MARGIN, y + 20, PAGE_WIDTH - MARGIN, y + 20, "0.72 0.77 0.83", 0.6);
    y += 25;
    if (description) {
      const lines = wrapText(description, 110);
      lines.slice(0, 2).forEach((line, index) => addText(line, MARGIN, y + index * 10, 7.5, false, "0.38 0.43 0.49"));
      y += Math.min(lines.length, 2) * 10 + 3;
    }
  };
  const drawPhotoBox = () => {
    ensureSpace(112);
    addText("Paste a recent passport-size photograph", MARGIN, y + 8, 8.5, false, "0.22 0.28 0.35");
    addText("Do not staple over the photo.", MARGIN, y + 22, 7.5, false, "0.42 0.47 0.53");
    const boxWidth = 82;
    const boxHeight = 91;
    const boxX = PAGE_WIDTH - MARGIN - boxWidth;
    addRect(boxX, y, boxWidth, boxHeight, "0.55 0.60 0.67", 0.8);
    y += boxHeight + 12;
  };
  const drawTextField = (field, x, top, width) => {
    const label = field.label + (field.required ? " *" : "");
    const maxChars = Math.max(16, Math.floor(width / 4.7));
    const labelLines = wrapText(label, maxChars).slice(0, 2);
    labelLines.forEach((line, index) => addText(line, x, top + 4 + index * 9, 8, true, "0.20 0.26 0.33"));
    addLine(x, top + 27, x + width - 8, top + 27);
  };
  const drawLongField = (field) => {
    const label = field.label + (field.required ? " *" : "");
    const labelLines = wrapText(label, 105).slice(0, 2);
    labelLines.forEach((line, index) => addText(line, MARGIN, y + 3 + index * 9, 8, true, "0.20 0.26 0.33"));
    const firstLine = y + Math.max(24, labelLines.length * 9 + 10);
    addLine(MARGIN, firstLine, PAGE_WIDTH - MARGIN, firstLine);
    addLine(MARGIN, firstLine + 15, PAGE_WIDTH - MARGIN, firstLine + 15);
    addLine(MARGIN, firstLine + 30, PAGE_WIDTH - MARGIN, firstLine + 30);
    y = firstLine + 38;
  };
  const drawChoiceField = (field) => {
    const label = field.label + (field.required ? " *" : "");
    const labelLines = wrapText(label, 105).slice(0, 2);
    labelLines.forEach((line, index) => addText(line, MARGIN, y + 3 + index * 9, 8, true, "0.20 0.26 0.33"));
    const choices = field.options || [];
    const maxChars = 105;
    const optionRows = [];
    let row = "";
    for (const option of choices) {
      const item = "(  ) " + option;
      if (!row) row = item;
      else if ((row + "     " + item).length <= maxChars) row += "     " + item;
      else {
        optionRows.push(row);
        row = item;
      }
    }
    if (row) optionRows.push(row);
    if (!optionRows.length) optionRows.push("(  ) Yes     (  ) No");
    const optionsTop = y + Math.max(20, labelLines.length * 9 + 7);
    optionRows.forEach((line, index) => addText(line, MARGIN, optionsTop + index * 12, 7.5, false, "0.24 0.29 0.35"));
    y = optionsTop + optionRows.length * 12 + 6;
  };
  const drawSignatureSection = () => {
    ensureSpace(120);
    y += 7;
    addText("DECLARATION", MARGIN, y, 9, true);
    addText("I confirm that the information given above is true to the best of my knowledge.", MARGIN, y + 15, 8, false);
    y += 36;
    const gap = 24;
    const half = (CONTENT_WIDTH - gap) / 2;
    addLine(MARGIN, y + 22, MARGIN + half, y + 22);
    addLine(MARGIN + half + gap, y + 22, PAGE_WIDTH - MARGIN, y + 22);
    addText("Parent / Guardian Signature", MARGIN, y + 26, 7.5, false);
    addText("Student Signature (if applicable)", MARGIN + half + gap, y + 26, 7.5, false);
    y += 50;
    addLine(MARGIN, y, MARGIN + 160, y);
    addText("Date", MARGIN, y + 4, 7.5, false);
    addLine(PAGE_WIDTH - MARGIN - 160, y, PAGE_WIDTH - MARGIN, y);
    addText("Place", PAGE_WIDTH - MARGIN - 160, y + 4, 7.5, false);
    y += 18;
  };

  startPage();
  for (const group of sections) {
    ensureSpace(group.kind === "photo" ? 170 : 155);
    drawSectionHeading(group.label, group.description);
    if (group.kind === "photo") {
      drawPhotoBox();
      continue;
    }

    let pending = null;
    for (const field of group.printableFields) {
      const wide = field.type === "textarea" || field.type === "select" || Boolean(field.options?.length);
      if (wide) {
        if (pending) {
          ensureSpace(40);
          drawTextField(pending, MARGIN, y, CONTENT_WIDTH / 2 - 8);
          y += 36;
          pending = null;
        }
        const optionField = field.type === "select" || Boolean(field.options?.length);
        const estimatedHeight = optionField ? 64 + Math.ceil((field.options?.length || 2) / 8) * 12 : 65;
        ensureSpace(estimatedHeight);
        if (optionField) drawChoiceField(field);
        else drawLongField(field);
        y += 2;
      } else if (pending) {
        ensureSpace(40);
        const half = (CONTENT_WIDTH - 18) / 2;
        drawTextField(pending, MARGIN, y, half);
        drawTextField(field, MARGIN + half + 18, y, half);
        y += 36;
        pending = null;
      } else {
        pending = field;
      }
    }
    if (pending) {
      ensureSpace(40);
      drawTextField(pending, MARGIN, y, (CONTENT_WIDTH - 18) / 2);
      y += 36;
    }
    y += 4;
  }

  if (String(termsAndConditions || "").trim()) {
    const termsLines = String(termsAndConditions).split(/\r?\n/).flatMap(line => wrapText(line, 115));
    ensureSpace(Math.min(110, 42 + termsLines.length * 10));
    drawSectionHeading("TERMS AND CONDITIONS");
    for (const line of termsLines) {
      ensureSpace(13);
      addText(line, MARGIN, y, 7.5, false, "0.24 0.29 0.35");
      y += 10;
    }
  }
  drawSignatureSection();
  finalizePage();

  const pdf = makePdfPages(pages);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFilename(title) + "-" + formType + ".pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

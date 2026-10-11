import { notFound } from "@/lib/errors";
import { REPORT_KEYS, isReportKey, type ReportKey, type ReportResult } from "./keys";

export type ReportFilterName = "classId" | "sectionId" | "from" | "to" | "feeGroupId";

export type ReportCatalogEntry = {
  title: string;
  columns: string[];
  filters: ReportFilterName[];
};

export const REPORT_ALIASES: Record<string, ReportKey> = {
  paid_fee: "daily-collection",
  datewise_paid_fee: "daily-collection",
  fee_type_wise_paid: "head-collection",
  fees_due: "dues",
  fee_summary: "dues",
  fee_accounting: "payment-log",
  daily_attendance: "daily-attendance",
  attendance_summary: "attendance-percent",
  student_strength: "strength",
  fuel: "fuel-logs",
  fuel_logs: "fuel-logs",
  transport_fuel: "fuel-logs",
};

export const REPORT_CATALOG: Record<ReportKey, ReportCatalogEntry> = {
  students: {
    title: "Student information",
    columns: ["admissionNo", "name", "class", "section", "mobile"],
    filters: ["classId", "sectionId"],
  },
  strength: {
    title: "Student strength",
    columns: ["class", "section", "gender", "count"],
    filters: ["classId", "sectionId"],
  },
  "daily-collection": {
    title: "Daily fee collection",
    columns: ["paidAt", "receiptNo", "admissionNo", "name", "amount", "method"],
    filters: ["from", "to"],
  },
  "head-collection": {
    title: "Head-wise collection",
    columns: ["head", "amount", "paid"],
    filters: ["feeGroupId"],
  },
  dues: {
    title: "Balance / due fees",
    columns: ["admissionNo", "name", "feeGroup", "description", "balance"],
    filters: ["classId", "sectionId", "feeGroupId"],
  },
  "attendance-register": {
    title: "Attendance monthly register",
    columns: ["date", "admissionNo", "name", "status"],
    filters: ["classId", "sectionId", "from", "to"],
  },
  "daily-attendance": {
    title: "Daily class attendance",
    columns: ["date", "class", "section", "status", "count"],
    filters: ["classId", "sectionId", "from", "to"],
  },
  "attendance-percent": {
    title: "Class attendance %",
    columns: ["name", "present", "total", "percent"],
    filters: ["classId", "sectionId", "from", "to"],
  },
  "notice-views": {
    title: "Notice views",
    columns: ["title", "channel", "type", "publishAt", "readCount"],
    filters: [],
  },
  "exam-results": {
    title: "Exam result list",
    columns: ["admissionNo", "name", "group", "exam", "marks", "status"],
    filters: [],
  },
  "user-log": {
    title: "User log",
    columns: ["username", "actorType", "lastLoginAt", "isActive"],
    filters: [],
  },
  "payment-log": {
    title: "Payment log",
    columns: ["receiptNo", "paidAt", "admissionNo", "amount", "method", "cancelled"],
    filters: ["from", "to"],
  },
  audit: {
    title: "Audit trail",
    columns: ["createdAt", "user", "action", "entity", "entityId"],
    filters: [],
  },
  staff: {
    title: "Staff directory",
    columns: ["employeeId", "name", "department", "designation", "phone"],
    filters: [],
  },
  "disabled-students": {
    title: "Disabled students",
    columns: ["admissionNo", "name", "mobile"],
    filters: [],
  },
  "library-issues": {
    title: "Library issues",
    columns: ["title", "memberNo", "issuedAt", "dueOn", "returned", "fine"],
    filters: [],
  },
  payroll: {
    title: "Payroll slips",
    columns: ["employeeId", "name", "period", "gross", "pf", "esi", "tds", "net"],
    filters: [],
  },
  visitors: {
    title: "Visitor register",
    columns: ["name", "purpose", "inAt", "outAt"],
    filters: [],
  },
  "store-orders": {
    title: "Store orders",
    columns: ["studentId", "itemId", "qty", "amount", "source", "status"],
    filters: [],
  },
  "result-summary": {
    title: "Result summary",
    columns: ["exam", "subject", "students", "present", "absent", "average"],
    filters: [],
  },
  "exam-absent": {
    title: "Exam absents",
    columns: ["student", "exam", "subject"],
    filters: [],
  },
  "consolidated-performance": {
    title: "Consolidated performance",
    columns: ["student", "exam", "total", "count", "average", "absences"],
    filters: [],
  },
  "admission-tests": {
    title: "Admission tests",
    columns: ["test", "date", "applicationNo", "name", "score", "appeared"],
    filters: [],
  },
  "fuel-logs": {
    title: "Transport fuel logs",
    columns: ["vehicleId", "litres", "amount", "odometer", "at", "note"],
    filters: [],
  },
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function resolveReportKey(value: string): ReportKey {
  const raw = trim(value);
  if (isReportKey(raw)) return raw;
  const dashed = raw.replace(/_/g, "-");
  if (isReportKey(dashed)) return dashed;
  const alias = REPORT_ALIASES[raw] ?? REPORT_ALIASES[dashed];
  if (alias) return alias;
  throw notFound("report");
}

export function reportSchema(key: string) {
  const resolved = resolveReportKey(key);
  const entry = REPORT_CATALOG[resolved];
  return {
    key: resolved,
    title: entry.title,
    filters: entry.filters,
    columns: entry.columns,
    aliases: Object.entries(REPORT_ALIASES)
      .filter(([, mapped]) => mapped === resolved)
      .map(([alias]) => alias),
  };
}

export function listReportCatalog() {
  return REPORT_KEYS.map((key) => reportSchema(key));
}

export function parseReportFilters(value: unknown) {
  const rec =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const classId = trim(rec.classId) || trim(rec.class_id) || undefined;
  const sectionId = trim(rec.sectionId) || trim(rec.section_id) || undefined;
  const from = trim(rec.from) || undefined;
  const to = trim(rec.to) || undefined;
  const feeGroupId =
    trim(rec.feeGroupId) || trim(rec.fee_group_id) || undefined;
  return { classId, sectionId, from, to, feeGroupId };
}

export function pickReportColumns(
  report: ReportResult,
  columns?: string[] | null,
): ReportResult {
  const wanted = (columns ?? [])
    .map((col) => trim(col))
    .filter((col) => col && report.columns.includes(col));
  const cols = wanted.length ? wanted : report.columns;
  return {
    title: report.title,
    columns: cols,
    rows: report.rows.map((row) => {
      const next: Record<string, string | number | null> = {};
      for (const col of cols) next[col] = row[col] ?? null;
      return next;
    }),
  };
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]!;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}

function u32(n: number) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function zipStore(files: Array<{ name: string; data: Uint8Array }>) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      name,
      file.data,
    ]);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const localBlob = concat(locals);
  const centralBlob = concat(centrals);
  return concat([
    localBlob,
    centralBlob,
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralBlob.length),
    u32(localBlob.length),
    u16(0),
  ]);
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colLetter(index: number) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function sheetXml(report: ReportResult) {
  const rows = [
    report.columns,
    ...report.rows.map((row) => report.columns.map((col) => row[col] ?? "")),
  ];
  const body = rows
    .map((cells, r) => {
      const rowNo = r + 1;
      const xml = cells
        .map((value, c) => {
          const ref = `${colLetter(c)}${rowNo}`;
          if (typeof value === "number" && Number.isFinite(value)) {
            return `<c r="${ref}"><v>${value}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(String(value))}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNo}">${xml}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function utf8(text: string) {
  return new TextEncoder().encode(text);
}

export function toXlsx(report: ReportResult) {
  const sheetName = xmlEscape((report.title || "Report").slice(0, 31) || "Report");
  return zipStore([
    {
      name: "[Content_Types].xml",
      data: utf8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: utf8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
    },
    {
      name: "xl/workbook.xml",
      data: utf8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: utf8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      ),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: utf8(sheetXml(report)),
    },
  ]);
}

export function xlsxFilename(key: string) {
  return `${resolveReportKey(key)}.xlsx`;
}

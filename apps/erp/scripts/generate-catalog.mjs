import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const spec = path.resolve(root, "../../erp-spec");

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const header = lines.shift().split(",");
  return lines.map((line) => {
    const cols = [];
    let cur = "";
    let q = false;
    for (const ch of line) {
      if (ch === '"') {
        q = !q;
        continue;
      }
      if (ch === "," && !q) {
        cols.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    cols.push(cur);
    const row = {};
    header.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

function kindFor(title, route) {
  const t = title.toLowerCase();
  const r = route.toLowerCase();
  if (t.includes("dashboard") || r.endsWith("/dashboard")) return "dashboard";
  if (
    t.includes("report") ||
    t.includes("search") ||
    t.includes("log") ||
    r.includes("report")
  )
    return "report";
  if (t.includes("setting") || t.includes("config") || r.includes("setting"))
    return "settings";
  if (
    /^(add|create|generate|print|design|import|upload|assign|approve|fill)/i.test(
      title,
    )
  )
    return "form";
  return "list";
}

function fieldsFor(module, kind) {
  if (kind === "report") {
    return [
      { key: "from", label: "From", type: "date" },
      { key: "to", label: "To", type: "date" },
      { key: "filter", label: "Filter", type: "text" },
      { key: "notes", label: "Notes", type: "text" },
    ];
  }
  if (kind === "settings") {
    return [
      { key: "name", label: "Name", type: "text" },
      { key: "enabled", label: "Enabled", type: "select", options: ["yes", "no"] },
      { key: "value", label: "Value", type: "text" },
    ];
  }
  const byModule = {
    students: [
      { key: "admissionNo", label: "Student ID", type: "text" },
      { key: "name", label: "Name", type: "text" },
      { key: "className", label: "Class", type: "text" },
      { key: "mobile", label: "Mobile", type: "text" },
    ],
    fees: [
      { key: "name", label: "Name", type: "text" },
      { key: "code", label: "Code", type: "text" },
      { key: "amount", label: "Amount (INR)", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"] },
    ],
    examinations: [
      { key: "name", label: "Name", type: "text" },
      { key: "code", label: "Code", type: "text" },
      { key: "maxMarks", label: "Max marks", type: "number" },
      { key: "date", label: "Date", type: "date" },
    ],
    hr: [
      { key: "employeeId", label: "Employee ID", type: "text" },
      { key: "name", label: "Name", type: "text" },
      { key: "department", label: "Department", type: "text" },
    ],
    academics: [
      { key: "name", label: "Name", type: "text" },
      { key: "code", label: "Code", type: "text" },
      { key: "session", label: "Session", type: "text" },
    ],
    admission: [
      { key: "applicationNo", label: "Application no", type: "text" },
      { key: "name", label: "Name", type: "text" },
      { key: "program", label: "Program", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["applied", "merit", "admitted", "rejected"] },
    ],
    attendance: [
      { key: "date", label: "Date", type: "date" },
      { key: "className", label: "Class", type: "text" },
      { key: "present", label: "Present", type: "number" },
      { key: "absent", label: "Absent", type: "number" },
    ],
  };
  return (
    byModule[module] ?? [
      { key: "name", label: "Name", type: "text" },
      { key: "code", label: "Code", type: "text" },
      { key: "notes", label: "Notes", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"] },
    ]
  );
}

const csv = parseCsv(fs.readFileSync(path.join(spec, "screens.csv"), "utf8"));
const screens = csv.map((row) => ({
  module: row.module,
  priority: row.priority,
  title: row.title,
  route: row.route,
  source: row.source,
  href: `/staff${row.route}`,
  kind: kindFor(row.title, row.route),
  fields: fieldsFor(row.module, kindFor(row.title, row.route)),
}));

const bySource = new Map(screens.map((s) => [s.source.replace(/\/$/, ""), s]));

const sidebarMd = fs.readFileSync(
  path.join(spec, "15-sidebar-inventory.md"),
  "utf8",
);
const nav = [];
let current = null;
for (const line of sidebarMd.split(/\r?\n/)) {
  const group = line.match(/^- \*\*(.+)\*\*\s*$/);
  const item = line.match(/^\s+- \*\*(.+?)\*\*\s+`([^`]+)`/);
  if (group && !line.includes("`")) {
    current = { label: group[1], items: [] };
    nav.push(current);
    continue;
  }
  if (item && current) {
    const source = item[2].replace(/\/$/, "");
    const match =
      bySource.get(source) ||
      bySource.get(source + "/index") ||
      screens.find((s) => s.source === source || s.source.startsWith(source + "/"));
    const href = match
      ? match.href
      : `/staff${source.replace(/^\/admin/, "").replaceAll("_", "-")}`;
    current.items.push({
      label: item[1],
      href,
      source,
      module: match?.module ?? "system",
    });
  }
}

const outDir = path.join(root, "src/lib/catalog");
fs.mkdirSync(outDir, { recursive: true });
const banner = `/* Generated by scripts/generate-catalog.mjs — do not edit by hand */\n`;
fs.writeFileSync(
  path.join(outDir, "screens.ts"),
  `${banner}export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
};
export type ScreenDef = {
  module: string;
  priority: string;
  title: string;
  route: string;
  source: string;
  href: string;
  kind: "dashboard" | "list" | "report" | "form" | "settings";
  fields: FieldDef[];
};
export const SCREENS: ScreenDef[] = ${JSON.stringify(screens, null, 2)};
export const SCREEN_COUNT = SCREENS.length;
export function screenByHref(href: string) {
  const clean = href.replace(/\\/+$/, "") || "/";
  return SCREENS.find((s) => s.href === clean) ?? SCREENS.find((s) => s.route === clean.replace(/^\\/staff/, "") || s.href === clean);
}
`,
);
fs.writeFileSync(
  path.join(outDir, "nav.ts"),
  `${banner}export type NavItem = { label: string; href: string; source: string; module: string };
export type NavGroup = { label: string; items: NavItem[] };
export const NAV: NavGroup[] = ${JSON.stringify(nav, null, 2)};
export const NAV_ITEM_COUNT = NAV.reduce((n, g) => n + g.items.length, 0);
`,
);

console.log("screens", screens.length);
console.log("nav groups", nav.length);
console.log(
  "nav items",
  nav.reduce((n, g) => n + g.items.length, 0),
);

import { BriefcaseBusiness, School, UserRound, Users } from "lucide-react";

export const EVENT_TYPES = ["School Event", "Class Event", "Parent Event", "Staff Event"];
export const EVENT_LABELS = [
  { value: "green", name: "Green Label", color: "#16834d", soft: "#dcfce7" },
  { value: "yellow", name: "Yellow Label", color: "#987000", soft: "#fef3c7" },
  { value: "blue", name: "Blue Label", color: "#245fbd", soft: "#dbeafe" },
  { value: "red", name: "Red Label", color: "#b42332", soft: "#fee2e2" },
  { value: "neutral", name: "Neutral Label", color: "#596579", soft: "#f3f4f6" }
];
export const EVENT_LABEL_VALUES = new Set(EVENT_LABELS.map(label => label.value));
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function localDateKey(date) {
  return String(date.getFullYear()) + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
export function todayKey() { return localDateKey(new Date()); }
export function parseDateKey(value) {
  const s = String(value || "").trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}
export function normalizeDate(value, fallback) {
  const def = fallback || todayKey();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return localDateKey(value);
  const parsed = parseDateKey(value);
  return parsed ? localDateKey(parsed) : def;
}
export function createId(prefix) {
  const root = prefix || "event";
  try { if (window.crypto && window.crypto.randomUUID) return root + "-" + window.crypto.randomUUID(); } catch {}
  return root + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}
export function normalizeEvent(raw, index) {
  const startDate = normalizeDate(raw && (raw.startDate || raw.eventDate || raw.date));
  const endDate = normalizeDate(raw && (raw.endDate || raw.startDate || raw.eventDate || raw.date), startDate);
  const eventType = EVENT_TYPES.includes(raw && raw.eventType) ? raw.eventType : EVENT_TYPES.includes(raw && raw.type) ? raw.type : "School Event";
  const description = String((raw && (raw.description || raw.detail || raw.title)) || "School event").trim();
  return {
    id: String((raw && raw.id) || ("legacy-" + index + "-" + startDate + "-" + description.toLowerCase().replace(/[^a-z0-9]+/g, "-"))),
    eventType,
    isHoliday: Boolean(raw && raw.isHoliday),
    labelColor: raw && EVENT_LABEL_VALUES.has(raw.labelColor) ? raw.labelColor : "",
    startDate,
    endDate: endDate < startDate ? startDate : endDate,
    description,
    classIds: raw && Array.isArray(raw.classIds) ? raw.classIds.map(String) : [],
    recipientIds: raw && Array.isArray(raw.recipientIds) ? raw.recipientIds.map(String) : [],
    createdAt: (raw && raw.createdAt) || null,
    updatedAt: (raw && raw.updatedAt) || null
  };
}
export function dateLabel(value, options) {
  const parsed = parseDateKey(value);
  return parsed ? parsed.toLocaleDateString("en-IN", options || { day: "2-digit", month: "short", year: "numeric" }) : "—";
}
export function monthHeading(value) {
  const parsed = parseDateKey(value) || new Date();
  return parsed.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
export function includesDate(event, key) {
  return String(event.startDate) <= key && String(event.endDate) >= key;
}
export function classLabel(student) {
  const name = String((student && (student.className || student.class)) || "").trim();
  const section = String((student && student.section) || "").trim();
  if (!name) return section ? "Section " + section : "";
  const classTokens = name.toLowerCase().split(/[\s()\-]+/).filter(Boolean);
  if (!section || classTokens.includes(section.toLowerCase())) return name;
  return name + " (" + section + ")";
}
export function toCsv(filename, rows) {
  const cell = value => "\"" + String(value == null ? "" : value).replaceAll("\"", "\"\"") + "\"";
  const blob = new Blob(["\uFEFF", rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function eventIcon(type) {
  if (type === "Class Event") return Users;
  if (type === "Parent Event") return UserRound;
  if (type === "Staff Event") return BriefcaseBusiness;
  return School;
}
export function eventCssType(type) {
  if (type === "Class Event") return "class";
  if (type === "Parent Event") return "parent";
  if (type === "Staff Event") return "staff";
  return "school";
}
export function typePlural(type) {
  return type.replace(" Event", " Events");
}

export function parentRecipientList(students) {
  const grouped = new Map();
  (students || []).forEach(student => {
    const name = String(student.parent || student.parentName || student.parent_name || student.parentGuardianName || student.parent_guardian_name || student.parentGuardian || student.guardianName || student.guardian || student.father || student.primaryParentName || student.fatherName || "").trim();
    if (!name) return;
    const phone = String(student.parentPhone || student.parent_phone || student.phone || student.contactNumber || student.mobileNumber || "").trim();
    const altPhone = String(student.alternatePhone || "").trim();
    const key = name.toLowerCase().replace(/\s+/g, " ") + "|" + phone.replace(/\D/g, "");
    if (!grouped.has(key)) grouped.set(key, {
      id: "parent-" + encodeURIComponent(key), name, email: String(student.parentEmail || student.parent_email || student.guardianEmail || student.guardian_email || "").trim(),
      phone, alternatePhone: altPhone, designation: "Parent / Guardian", type: "parent", children: []
    });
    grouped.get(key).children.push({
      name: String(student.name || "Student"), className: classLabel(student),
      scholarNumber: String(student.enrollmentNumber || student.id || student.studentCode || "—")
    });
  });
  return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
}
export function mapStaffRecipients(people) {
  return (people || [])
    .filter(person => ["teacher", "staff", "day_care", "other", "transport_admin"].includes(String(person.personType || "").toLowerCase()))
    .map(person => ({
      id: "person-" + person.id, personId: person.id,
      name: String(person.fullName || [person.firstName, person.lastName].filter(Boolean).join(" ") || "Unnamed contact"),
      email: String(person.email || "").trim(),
      phone: String(person.contactNumber || "").trim(),
      alternatePhone: String(person.alternateContactNumber || "").trim(),
      designation: String(person.designation || person.personType || "Staff").replaceAll("_", " "),
      type: String(person.personType || "staff").toLowerCase(),
      className: String(person.className || "").trim()
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

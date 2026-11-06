import { appLocale, formatMoney } from "../../school-locale.js";
export function dateKey(date) {
  return String(date.getFullYear()) + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

export function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const s = String(value).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function formatDate(value, options = { day: "numeric", month: "short" }) {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString(appLocale(), options) : "—";
}

export function daysBetween(from, to) {
  return Math.round((new Date(to.getFullYear(), to.getMonth(), to.getDate()) - new Date(from.getFullYear(), from.getMonth(), from.getDate())) / 86400000);
}

export function nextBirthday(student, now) {
  const dob = parseLocalDate(student.dob || student.dateOfBirth);
  if (!dob) return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < start) next.setFullYear(now.getFullYear() + 1);
  return { student, date: next, days: daysBetween(start, next) };
}

export function money(value) {
  return formatMoney(Number(value || 0), { maximumFractionDigits: 0 });
}

export function studentName(student) {
  return String(student.name || student.fullName || "Student").trim();
}

export function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

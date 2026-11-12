export const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "Excused"];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dateKey(date) {
  return String(date.getFullYear()) + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}
export function parseDateKey(key) {
  const parts = String(key || "").split("-").map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}
export function formatDate(key, options) {
  return parseDateKey(key).toLocaleDateString(undefined, options || {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
}
export function monthCells(key) {
  const focus = parseDateKey(key);
  const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const firstWeekday = first.getDay();
  return Array.from({ length: 42 }, function (_, index) {
    const date = new Date(focus.getFullYear(), focus.getMonth(), index - firstWeekday + 1);
    return { key: dateKey(date), date: date, inMonth: date.getMonth() === focus.getMonth() };
  });
}
export function moveMonth(key, offset) {
  const current = parseDateKey(key);
  const day = current.getDate();
  const targetMonth = new Date(current.getFullYear(), current.getMonth() + offset, 1);
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  return dateKey(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(day, lastDay)));
}
export function moveDay(key, offset) {
  const current = parseDateKey(key);
  return dateKey(new Date(current.getFullYear(), current.getMonth(), current.getDate() + offset));
}
export function getName(person) {
  return person.fullName || [person.firstName, person.lastName].filter(Boolean).join(" ") || person.name || "Unnamed";
}
export function getMetadataLabel(person, mode) {
  const metadata = person.metadata && typeof person.metadata === "object" ? person.metadata : {};
  const keys = mode === "Role"
    ? ["role", "staffRole", "designation", "jobTitle", "position", "title"]
    : ["staffCategory", "category", "department", "group", "categoryName"];
  for (const key of keys) {
    const value = metadata[key] || person[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return mode === "Role" ? (person.personType === "teacher" ? "Teacher" : "Staff") :
    (person.personType === "teacher" ? "Teaching" : "General Staff");
}
export function getStatusCounts(roster, state, keySelector) {
  const counts = { Present: 0, Absent: 0, Late: 0, Excused: 0, Unmarked: 0, Total: roster.length };
  roster.forEach(function (person) {
    const status = state[keySelector(person)];
    if (ATTENDANCE_STATUSES.includes(status)) counts[status] += 1;
    else counts.Unmarked += 1;
  });
  return counts;
}
export function getSummaryCounts(state) {
  const counts = { marked: 0, present: 0, absent: 0, late: 0, excused: 0 };
  Object.values(state || {}).forEach(function (status) {
    if (!ATTENDANCE_STATUSES.includes(status)) return;
    counts.marked += 1;
    if (status === "Present") counts.present += 1;
    if (status === "Absent") counts.absent += 1;
    if (status === "Late") counts.late += 1;
    if (status === "Excused") counts.excused += 1;
  });
  return counts;
}

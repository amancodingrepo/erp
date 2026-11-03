/**
 * Campus registers: small, validated record lists (call log, postal, complaints, gate passes,
 * exam masters, lesson topics, staff tasks and so on) stored in the existing ScreenRecord table
 * under the screenKey "register:<kind>". This file is pure (no database) so it can be unit tested;
 * registers-store.ts does the reads and writes.
 *
 * Every kind declares its fields once. The API validates writes against them, checks that linked
 * records belong to the caller's campus, and returns the same definitions so screens can render
 * forms without repeating the rules.
 */
import { validationError } from "@/lib/errors";

export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "date"
  | "datetime"
  | "url"
  | "phone"
  | "enum"
  | "bool"
  | "staff"
  | "student"
  | "class"
  | "subject"
  | "program"
  | "leaveType"
  | "examPaper"
  | "register";

export type RegisterField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  /** For type "register": the kind it points at. */
  ref?: string;
  min?: number;
  max?: number;
};

export type Perm = [module: string, feature: string, action: string];

export type RegisterKind = {
  kind: string;
  title: string;
  view: Perm;
  write: Perm;
  fields: RegisterField[];
  /** Field whose value becomes the row title shown in lists and audit. */
  titleField: string;
  /** Optional workflow. The first status is given to new records. */
  statuses?: string[];
  /** Pairs of fields where the second must not be before / below the first. */
  ordered?: Array<[string, string]>;
  /** Server-generated unique code (for example a gate pass number). */
  codePrefix?: string;
};

const FRONT: Pick<RegisterKind, "view" | "write"> = { view: ["students", "profile", "view"], write: ["students", "profile", "edit"] };
const HR: Pick<RegisterKind, "view" | "write"> = { view: ["hr", "staff", "view"], write: ["hr", "staff", "edit"] };
const EXAMS: Pick<RegisterKind, "view" | "write"> = { view: ["exams", "group", "view"], write: ["exams", "group", "create"] };
const ACAD: Pick<RegisterKind, "view" | "write"> = { view: ["academics", "class", "view"], write: ["academics", "class", "create"] };
const PAY: Pick<RegisterKind, "view" | "write"> = { view: ["fees", "master", "view"], write: ["fees", "master", "edit"] };

const ROLES = ["Paper setter", "Examiner", "Moderator", "Invigilator", "Supervisor", "Other"];

export const REGISTER_KINDS: RegisterKind[] = [
  // Front office
  { kind: "phone-calls", title: "Phone call log", ...FRONT, titleField: "name", fields: [
    { key: "name", label: "Caller / person called", type: "text", required: true },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "direction", label: "Call", type: "enum", options: ["Incoming", "Outgoing"], required: true },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "purpose", label: "Purpose", type: "text" },
    { key: "followUpOn", label: "Follow up on", type: "date" },
    { key: "note", label: "Note", type: "longtext" },
  ] },
  { kind: "postal-dispatch", title: "Postal dispatch", ...FRONT, titleField: "toTitle", fields: [
    { key: "toTitle", label: "Sent to", type: "text", required: true },
    { key: "referenceNo", label: "Reference / tracking no", type: "text" },
    { key: "address", label: "Address", type: "longtext" },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "note", label: "Note", type: "text" },
  ] },
  { kind: "postal-receive", title: "Postal receive", ...FRONT, titleField: "fromTitle", fields: [
    { key: "fromTitle", label: "Received from", type: "text", required: true },
    { key: "referenceNo", label: "Reference / tracking no", type: "text" },
    { key: "address", label: "Address", type: "longtext" },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "note", label: "Note", type: "text" },
  ] },
  { kind: "complaints", title: "Complaint", ...FRONT, titleField: "complainant", statuses: ["Open", "In progress", "Resolved", "Closed"], fields: [
    { key: "complainant", label: "Complainant", type: "text", required: true },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "complaintType", label: "Type", type: "text" },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "description", label: "Complaint", type: "longtext", required: true },
    { key: "assignedStaffId", label: "Assigned to", type: "staff" },
    { key: "actionTaken", label: "Action taken", type: "longtext" },
  ] },
  { kind: "inward", title: "Inward", ...FRONT, titleField: "subject", fields: [
    { key: "fromTitle", label: "From", type: "text", required: true },
    { key: "subject", label: "Subject", type: "text", required: true },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "referenceNo", label: "Reference no", type: "text" },
    { key: "receivedById", label: "Received by", type: "staff" },
    { key: "note", label: "Note", type: "longtext" },
  ] },
  { kind: "outward", title: "Outward", ...FRONT, titleField: "subject", fields: [
    { key: "toTitle", label: "To", type: "text", required: true },
    { key: "subject", label: "Subject", type: "text", required: true },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "referenceNo", label: "Reference no", type: "text" },
    { key: "sentById", label: "Sent by", type: "staff" },
    { key: "note", label: "Note", type: "longtext" },
  ] },

  // Hostel
  { kind: "room-types", title: "Room type", ...FRONT, titleField: "name", fields: [
    { key: "name", label: "Room type", type: "text", required: true },
    { key: "beds", label: "Beds", type: "number", min: 1, max: 50 },
    { key: "description", label: "Description", type: "text" },
  ] },
  { kind: "gatepasses", title: "Gate pass", ...FRONT, titleField: "reason", codePrefix: "GP", statuses: ["Issued", "Out", "Returned", "Cancelled"], ordered: [["outAt", "expectedBackAt"]], fields: [
    { key: "studentId", label: "Student", type: "student", required: true },
    { key: "reason", label: "Reason", type: "text", required: true },
    { key: "outAt", label: "Going out at", type: "datetime", required: true },
    { key: "expectedBackAt", label: "Back by", type: "datetime" },
    { key: "guardian", label: "Collected by", type: "text" },
  ] },

  // Human resource
  { kind: "teacher-ratings", title: "Teacher rating", ...HR, titleField: "period", fields: [
    { key: "staffId", label: "Teacher", type: "staff", required: true },
    { key: "period", label: "Period", type: "text", required: true },
    { key: "rating", label: "Rating (1-5)", type: "number", min: 1, max: 5, required: true },
    { key: "ratedBy", label: "Rated by", type: "text" },
    { key: "remarks", label: "Remarks", type: "longtext" },
  ] },
  { kind: "teacher-research", title: "Teacher research", ...HR, titleField: "title", fields: [
    { key: "staffId", label: "Teacher", type: "staff", required: true },
    { key: "category", label: "Type", type: "enum", options: ["Publication", "Research project", "Award", "Achievement", "Patent", "Conference"], required: true },
    { key: "title", label: "Title", type: "text", required: true },
    { key: "year", label: "Year", type: "number", min: 1950, max: 2100 },
    { key: "detail", label: "Details", type: "longtext" },
    { key: "link", label: "Link", type: "url" },
  ] },
  { kind: "leave-approvers", title: "Leave approval setup", ...HR, titleField: "appliesTo", fields: [
    { key: "appliesTo", label: "Leave of", type: "enum", options: ["Staff", "Students"], required: true },
    { key: "leaveTypeId", label: "Leave type (blank = all)", type: "leaveType" },
    { key: "approverId", label: "Approver", type: "staff", required: true },
  ] },
  { kind: "staff-leave-batches", title: "Staff leave batch", ...HR, titleField: "name", ordered: [["fromDate", "toDate"]], fields: [
    { key: "name", label: "Leave year", type: "text", required: true },
    { key: "fromDate", label: "From", type: "date", required: true },
    { key: "toDate", label: "To", type: "date", required: true },
  ] },
  { kind: "staff-week-offs", title: "Staff week off", ...HR, titleField: "weekday", fields: [
    { key: "staffId", label: "Staff", type: "staff", required: true },
    { key: "weekday", label: "Day off", type: "enum", options: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], required: true },
  ] },
  { kind: "staff-tasks", title: "Task", ...HR, titleField: "title", statuses: ["To do", "In progress", "Done"], fields: [
    { key: "title", label: "Task", type: "text", required: true },
    { key: "staffId", label: "Given to", type: "staff", required: true },
    { key: "dueOn", label: "Due on", type: "date" },
    { key: "detail", label: "Details", type: "longtext" },
  ] },
  { kind: "staff-certificate-templates", title: "Staff certificate template", ...HR, titleField: "name", fields: [
    { key: "name", label: "Certificate title", type: "text", required: true },
    { key: "body", label: "Wording", type: "longtext", required: true },
  ] },
  { kind: "staff-certificate-issues", title: "Staff certificate issued", ...HR, titleField: "certificate", fields: [
    { key: "staffId", label: "Staff", type: "staff", required: true },
    { key: "templateId", label: "Template", type: "register", ref: "staff-certificate-templates", required: true },
    { key: "certificate", label: "Certificate", type: "text", required: true },
  ] },

  // Examinations
  { kind: "exam-types", title: "Exam type", ...EXAMS, titleField: "name", fields: [
    { key: "name", label: "Exam type", type: "text", required: true },
    { key: "code", label: "Code", type: "text" },
    { key: "description", label: "Description", type: "text" },
  ] },
  { kind: "marks-divisions", title: "Marks division", ...EXAMS, titleField: "name", ordered: [["minPct", "maxPct"]], fields: [
    { key: "name", label: "Division", type: "text", required: true },
    { key: "minPct", label: "From %", type: "number", min: 0, max: 100, required: true },
    { key: "maxPct", label: "To %", type: "number", min: 0, max: 100, required: true },
  ] },
  { kind: "relative-grades", title: "Relative grade", ...EXAMS, titleField: "name", fields: [
    { key: "name", label: "Grade", type: "text", required: true },
    { key: "topPercent", label: "Top % of the class", type: "number", min: 0, max: 100, required: true },
    { key: "description", label: "Description", type: "text" },
  ] },
  { kind: "result-remarks", title: "Result remark", ...EXAMS, titleField: "remark", ordered: [["minPct", "maxPct"]], fields: [
    { key: "minPct", label: "From %", type: "number", min: 0, max: 100, required: true },
    { key: "maxPct", label: "To %", type: "number", min: 0, max: 100, required: true },
    { key: "remark", label: "Remark", type: "text", required: true },
  ] },
  { kind: "remuneration-rates", title: "Remuneration rate", ...EXAMS, titleField: "role", fields: [
    { key: "role", label: "Duty", type: "enum", options: ROLES, required: true },
    { key: "unit", label: "Paid", type: "enum", options: ["Per paper", "Per hour", "Per session", "Per answer book"], required: true },
    { key: "rate", label: "Rate (₹)", type: "number", min: 0, required: true },
  ] },
  { kind: "remuneration-hours", title: "Exam duty", ...EXAMS, titleField: "role", fields: [
    { key: "staffId", label: "Staff", type: "staff", required: true },
    { key: "role", label: "Duty", type: "enum", options: ROLES, required: true },
    { key: "quantity", label: "Quantity (papers / hours / sessions)", type: "number", min: 0, required: true },
    { key: "date", label: "Date", type: "date" },
    { key: "examName", label: "Exam", type: "text" },
  ] },
  { kind: "question-papers", title: "Question paper", ...EXAMS, titleField: "title", statuses: ["Assigned", "Submitted", "Approved", "Rejected"], fields: [
    { key: "title", label: "Paper", type: "text", required: true },
    { key: "subjectId", label: "Subject", type: "subject", required: true },
    { key: "examPaperId", label: "Exam paper", type: "examPaper" },
    { key: "setterId", label: "Paper setter", type: "staff", required: true },
    { key: "dueOn", label: "Due on", type: "date" },
    { key: "fileUrl", label: "Paper file link", type: "url" },
    { key: "reviewNote", label: "Review note", type: "text" },
  ] },

  // Lesson plan and academics
  { kind: "lesson-topics", title: "Topic", ...ACAD, titleField: "topic", fields: [
    { key: "subjectId", label: "Subject", type: "subject", required: true },
    { key: "classId", label: "Class", type: "class" },
    { key: "lesson", label: "Lesson", type: "text", required: true },
    { key: "topic", label: "Topic", type: "text", required: true },
    { key: "order", label: "Order", type: "number", min: 0 },
  ] },
  { kind: "instruction-plans", title: "Instruction plan", ...ACAD, titleField: "plan", fields: [
    { key: "subjectId", label: "Subject", type: "subject", required: true },
    { key: "classId", label: "Class", type: "class" },
    { key: "week", label: "Week", type: "number", min: 1, max: 60 },
    { key: "method", label: "Teaching method", type: "text" },
    { key: "plan", label: "Plan", type: "longtext", required: true },
  ] },
  { kind: "syllabus-status", title: "Syllabus status", ...ACAD, titleField: "topic", statuses: ["Not started", "In progress", "Completed"], fields: [
    { key: "subjectId", label: "Subject", type: "subject", required: true },
    { key: "classId", label: "Class", type: "class", required: true },
    { key: "topic", label: "Topic", type: "text", required: true },
    { key: "completedOn", label: "Completed on", type: "date" },
  ] },
  { kind: "semesters", title: "Semester", ...ACAD, titleField: "name", ordered: [["startsOn", "endsOn"]], fields: [
    { key: "programId", label: "Program", type: "program", required: true },
    { key: "name", label: "Semester", type: "text", required: true },
    { key: "number", label: "Number", type: "number", min: 1, max: 20, required: true },
    { key: "startsOn", label: "Starts", type: "date" },
    { key: "endsOn", label: "Ends", type: "date" },
  ] },
  { kind: "semester-allocations", title: "Semester allocation", ...ACAD, titleField: "note", fields: [
    { key: "semesterId", label: "Semester", type: "register", ref: "semesters", required: true },
    { key: "classId", label: "Class", type: "class", required: true },
    { key: "note", label: "Note", type: "text" },
  ] },
  { kind: "program-intakes", title: "Program intake", ...ACAD, titleField: "year", fields: [
    { key: "programId", label: "Program", type: "program", required: true },
    { key: "year", label: "Admission year", type: "text", required: true },
    { key: "seats", label: "Seats", type: "number", min: 0, required: true },
  ] },

  // Payroll
  { kind: "tax-declarations", title: "Income tax element", ...PAY, titleField: "name", fields: [
    { key: "name", label: "Section / element", type: "text", required: true },
    { key: "maxLimit", label: "Yearly limit (₹)", type: "number", min: 0 },
    { key: "description", label: "Description", type: "text" },
  ] },
  { kind: "visiting-staff", title: "Visiting staff session", ...PAY, titleField: "name", statuses: ["Unpaid", "Paid"], fields: [
    { key: "name", label: "Visiting staff", type: "text", required: true },
    { key: "subjectId", label: "Subject", type: "subject" },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "hours", label: "Hours", type: "number", min: 0, required: true },
    { key: "rate", label: "Rate per hour (₹)", type: "number", min: 0, required: true },
  ] },

  // Other course (liberal arts) form
  { kind: "other-courses", title: "Other course", view: ["students", "profile", "view"], write: ["settings", "campus", "edit"], titleField: "name", fields: [
    { key: "name", label: "Course", type: "text", required: true },
    { key: "seats", label: "Seats", type: "number", min: 0 },
    { key: "open", label: "Open for applications", type: "bool" },
  ] },
  { kind: "other-course-applications", title: "Other course application", ...FRONT, titleField: "note", statuses: ["Applied", "Approved", "Rejected"], fields: [
    { key: "studentId", label: "Student", type: "student", required: true },
    { key: "courseId", label: "Course", type: "register", ref: "other-courses", required: true },
    { key: "note", label: "Note", type: "text" },
  ] },
];

export const REGISTER_BY_KIND = new Map(REGISTER_KINDS.map((k) => [k.kind, k]));
export const screenKeyFor = (kind: string) => "register:" + kind;
export const isRegisterScreenKey = (key: string) => key.trim().toLowerCase().startsWith("register:");

export function registerKind(kind: string) {
  const def = REGISTER_BY_KIND.get(kind);
  if (!def) throw validationError({ kind: "unknown register" });
  return def;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** References a write points at, so the store can check they belong to the campus. */
export type RegisterRef = { type: FieldType; id: string; ref?: string; key: string };

/**
 * Validates and normalises a payload. `partial` is for edits: only the given keys are checked,
 * and required fields may be left out. Unknown keys are dropped. Throws validationError.
 */
export function parseRegisterPayload(def: RegisterKind, input: unknown, partial = false) {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Record<string, string | number | boolean | null> = {};
  const errors: Record<string, string> = {};
  const refs: RegisterRef[] = [];
  for (const field of def.fields) {
    const has = Object.prototype.hasOwnProperty.call(raw, field.key);
    if (partial && !has) continue;
    const value = raw[field.key];
    const blank = value === undefined || value === null || (typeof value === "string" && value.trim() === "");
    if (blank) {
      if (field.required) errors[field.key] = field.label + " is required";
      else if (has) out[field.key] = null;
      continue;
    }
    if (field.type === "bool") {
      if (typeof value !== "boolean") errors[field.key] = field.label + " must be yes or no";
      else out[field.key] = value;
      continue;
    }
    if (field.type === "number") {
      const n = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isFinite(n)) { errors[field.key] = field.label + " must be a number"; continue; }
      if (field.min !== undefined && n < field.min) { errors[field.key] = field.label + " must be at least " + field.min; continue; }
      if (field.max !== undefined && n > field.max) { errors[field.key] = field.label + " must be at most " + field.max; continue; }
      out[field.key] = n;
      continue;
    }
    const text = String(value).trim();
    if (text.length > (field.type === "longtext" ? 5000 : 300)) { errors[field.key] = field.label + " is too long"; continue; }
    if (field.type === "date" && !DATE.test(text)) { errors[field.key] = field.label + " must be a date"; continue; }
    if (field.type === "datetime" && !DATETIME.test(text)) { errors[field.key] = field.label + " must be a date and time"; continue; }
    if (field.type === "url" && !/^https?:\/\/\S+$/i.test(text)) { errors[field.key] = field.label + " must start with http:// or https://"; continue; }
    if (field.type === "phone" && !/^[+\d][\d\s-]{5,19}$/.test(text)) { errors[field.key] = field.label + " is not a phone number"; continue; }
    if (field.type === "enum" && !(field.options || []).includes(text)) { errors[field.key] = field.label + " must be one of: " + (field.options || []).join(", "); continue; }
    if (["staff", "student", "class", "subject", "program", "leaveType", "examPaper", "register"].includes(field.type)) {
      refs.push({ type: field.type, id: text, ref: field.ref, key: field.key });
    }
    out[field.key] = text;
  }
  for (const [first, second] of def.ordered || []) {
    const a = out[first] ?? null;
    const b = out[second] ?? null;
    if (a !== null && b !== null && a > b) {
      const label = (key: string) => def.fields.find((f) => f.key === key)?.label || key;
      const numeric = def.fields.find((f) => f.key === second)?.type === "number";
      errors[second] = label(second) + (numeric ? " must not be less than " : " must not be before ") + label(first);
    }
  }
  if (Object.keys(errors).length) throw validationError(errors);
  return { payload: out, refs };
}

export function parseRegisterStatus(def: RegisterKind, status: unknown) {
  if (status === undefined) return undefined;
  if (!def.statuses?.length) throw validationError({ status: "this register has no status" });
  if (typeof status !== "string" || !def.statuses.includes(status)) throw validationError({ status: "must be one of: " + def.statuses.join(", ") });
  return status;
}

export function registerTitle(def: RegisterKind, payload: Record<string, unknown>) {
  const value = payload[def.titleField];
  return value === null || value === undefined || value === "" ? def.title : String(value).slice(0, 200);
}

/** Definitions as sent to screens (no permissions). */
export function publicRegisterKinds() {
  return REGISTER_KINDS.map(({ kind, title, fields, statuses, titleField, codePrefix }) => ({ kind, title, fields, statuses: statuses || [], titleField, hasCode: Boolean(codePrefix) }));
}

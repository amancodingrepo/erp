import { prisma } from "@/lib/db";
import { validationError } from "@/lib/errors";
import { parseAttendanceSource } from "@/lib/services/campus-attendance-source";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function firstId(rec: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const id = trim(rec[key]);
    if (id) return id;
  }
  return "";
}

function idList(rec: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = rec[key];
    if (Array.isArray(value)) {
      return value.map((row) => trim(row)).filter(Boolean);
    }
  }
  return [];
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError({ [field]: "required" });
  }
  return value as Record<string, unknown>;
}

export function parseHouseBulkAssign(input: unknown) {
  const rec = asRecord(input, "studentIds");
  const studentIds = idList(rec, ["studentIds", "student_ids"]);
  if (!studentIds.length) throw validationError({ studentIds: "required" });
  const houseRaw = firstId(rec, ["houseId", "house_id"]);
  const houseId =
    !houseRaw || houseRaw === "none" || rec.houseId === null || rec.house_id === null
      ? null
      : houseRaw;
  return { studentIds, houseId };
}

export function parseGradeEligibility(input: unknown) {
  const rec = asRecord(input, "classId");
  const classId = firstId(rec, ["classId", "class_id"]);
  const fromBirthDate = firstId(rec, [
    "fromBirthDate",
    "from_dob",
    "dob_min",
    "min_dob",
  ]);
  const toBirthDate = firstId(rec, ["toBirthDate", "to_dob", "dob_max", "max_dob"]);
  if (!classId) throw validationError({ classId: "required" });
  if (!fromBirthDate) throw validationError({ fromBirthDate: "required" });
  if (!toBirthDate) throw validationError({ toBirthDate: "required" });
  return {
    id: firstId(rec, ["id"]) || undefined,
    classId,
    fromBirthDate,
    toBirthDate,
  };
}

export function attachGradeEligibility<
  T extends { classId: string; fromBirthDate: string; toBirthDate: string },
>(rows: T[]) {
  return rows.map((row) => ({
    ...row,
    class_id: row.classId,
    from_dob: row.fromBirthDate,
    to_dob: row.toBirthDate,
  }));
}

export function parseGradeEligibilityPatch(input: unknown) {
  const rec = asRecord(input, "eligibility");
  const patch = {
    classId: firstId(rec, ["classId", "class_id"]) || undefined,
    fromBirthDate:
      firstId(rec, ["fromBirthDate", "from_dob", "dob_min", "min_dob"]) || undefined,
    toBirthDate:
      firstId(rec, ["toBirthDate", "to_dob", "dob_max", "max_dob"]) || undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ eligibility: "required" });
  }
  return patch;
}

const ARRANGEMENTS = new Set(["mix", "boys_first", "girls_first"]);
const SORTS = new Set(["last", "first", "id"]);

export function parseRollAssign(input: unknown) {
  const rec = asRecord(input, "classId");
  const classId = firstId(rec, ["classId", "class_id"]);
  const sectionId = firstId(rec, ["sectionId", "section_id"]) || classId;
  if (!classId) throw validationError({ classId: "required" });
  const strategy = trim(rec.strategy).toLowerCase().replace(/-/g, "_");
  let arrangement: "mix" | "boys_first" | "girls_first" = "mix";
  let sort: "last" | "first" | "id" = "last";
  if (strategy === "boys" || strategy === "boys_first") arrangement = "boys_first";
  else if (strategy === "girls" || strategy === "girls_first") {
    arrangement = "girls_first";
  } else if (ARRANGEMENTS.has(strategy)) {
    arrangement = strategy as "mix" | "boys_first" | "girls_first";
  }
  if (strategy === "first" || strategy === "last" || strategy === "id") {
    sort = strategy;
  }
  const arrangementRaw = trim(rec.arrangement);
  if (ARRANGEMENTS.has(arrangementRaw)) {
    arrangement = arrangementRaw as "mix" | "boys_first" | "girls_first";
  }
  const sortRaw = trim(rec.sort);
  if (SORTS.has(sortRaw)) sort = sortRaw as "last" | "first" | "id";
  const startRaw = rec.startFrom ?? rec.start_from ?? 1;
  const startFrom = Number(startRaw);
  return {
    classId,
    sectionId,
    arrangement,
    sort,
    startFrom: Number.isFinite(startFrom) ? startFrom : 1,
  };
}

export async function resolveRollTarget(
  campusId: string,
  parsed: { classId: string; sectionId: string },
) {
  const section = await prisma.section.findFirst({
    where: {
      id: parsed.sectionId,
      class: { program: { department: { campusId } } },
    },
    select: { id: true, classId: true },
  });
  if (section) return { classId: section.classId, sectionId: section.id };
  const klass = await prisma.class.findFirst({
    where: { id: parsed.classId, program: { department: { campusId } } },
    select: { id: true, sections: { select: { id: true } } },
  });
  if (!klass) throw validationError({ classId: "unknown" });
  if (klass.sections.length !== 1) {
    throw validationError({ sectionId: "required" });
  }
  return { classId: klass.id, sectionId: klass.sections[0]!.id };
}

export function parseFeeRemind(input: unknown) {
  const rec =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const classId = firstId(rec, ["classId", "class_id"]) || undefined;
  const channelRaw = trim(rec.channel).toUpperCase();
  const channel = channelRaw === "EMAIL" ? "EMAIL" : "SMS";
  return { classId, channel: channel as "EMAIL" | "SMS" };
}

export function parseFeeTemplateLine(input: unknown) {
  const rec = asRecord(input, "feeTypeId");
  const feeTypeId = firstId(rec, ["feeTypeId", "fee_type_id"]);
  const amount = Number(rec.amount);
  if (!feeTypeId) throw validationError({ feeTypeId: "required" });
  if (!Number.isFinite(amount) || amount <= 0) {
    throw validationError({ amount: "must be positive" });
  }
  const dueDate = firstId(rec, ["dueDate", "due_date"]) || undefined;
  const installmentId =
    firstId(rec, ["installmentId", "installment_id"]) || undefined;
  return { feeTypeId, amount, dueDate, installmentId };
}

export function parseFeeTemplate(input: unknown) {
  const rec = asRecord(input, "sessionId");
  const sessionId = firstId(rec, [
    "sessionId",
    "session_id",
    "academic_year_id",
    "academicYearId",
  ]);
  const groupId = firstId(rec, ["groupId", "group_id", "fee_group_id"]);
  if (!sessionId) throw validationError({ sessionId: "required" });
  if (!groupId) throw validationError({ groupId: "required" });
  const rawLines = rec.lines;
  if (!Array.isArray(rawLines) || !rawLines.length) {
    throw validationError({ lines: "required" });
  }
  return {
    sessionId,
    groupId,
    dueDate: firstId(rec, ["dueDate", "due_date"]) || undefined,
    lines: rawLines.map((line) => parseFeeTemplateLine(line)),
  };
}

export function parseFeeTemplateApply(input: unknown) {
  const rec = asRecord(input, "classIds");
  const classIds = idList(rec, ["classIds", "class_ids"]);
  const studentIds = idList(rec, ["studentIds", "student_ids"]);
  if (!classIds.length && !studentIds.length) {
    throw validationError({ classIds: "required" });
  }
  return {
    classIds,
    studentIds,
    sessionId:
      firstId(rec, ["sessionId", "session_id", "academic_year_id"]) || undefined,
    sectionId: firstId(rec, ["sectionId", "section_id"]) || undefined,
  };
}

export async function resolveApplyClassIds(
  campusId: string,
  parsed: { classIds: string[]; studentIds: string[] },
) {
  const ids = [...parsed.classIds];
  if (parsed.studentIds.length) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        isCurrent: true,
        studentId: { in: parsed.studentIds },
        student: { campusId },
      },
      select: { classId: true },
    });
    for (const row of enrollments) {
      if (!ids.includes(row.classId)) ids.push(row.classId);
    }
  }
  if (!ids.length) throw validationError({ classIds: "required" });
  const out: Array<{ classId: string; sectionId?: string }> = [];
  for (const id of ids) {
    const section = await prisma.section.findFirst({
      where: {
        id,
        class: { program: { department: { campusId } } },
      },
      select: { id: true, classId: true },
    });
    if (section) {
      out.push({ classId: section.classId, sectionId: section.id });
      continue;
    }
    const klass = await prisma.class.findFirst({
      where: { id, program: { department: { campusId } } },
      select: { id: true },
    });
    if (!klass) throw validationError({ classId: "unknown" });
    out.push({ classId: klass.id });
  }
  return out;
}

export function parsePaymentReverse(input: unknown) {
  const rec =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const reason = trim(rec.reason) || "reverse";
  return { reason };
}

export function parseStudentDeactivate(input: unknown) {
  const rec = asRecord(input, "reasonId");
  const reasonId = firstId(rec, ["reasonId", "reason_id"]);
  if (!reasonId) throw validationError({ reasonId: "required" });
  return { reasonId };
}

export function parseSearchPeople(input: unknown) {
  const rec = asRecord(input, "q");
  const names = firstId(rec, ["names", "name"]);
  let firstName = firstId(rec, ["firstName", "first_name"]);
  let lastName = firstId(rec, ["lastName", "last_name"]);
  if (names && !firstName && !lastName) {
    const parts = names.split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? "";
    lastName = parts.slice(1).join(" ");
  }
  const parsed = {
    q: firstId(rec, ["q", "query"]) || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    phone: firstId(rec, ["phone", "mobile"]) || undefined,
    email: firstId(rec, ["email"]) || undefined,
    id:
      firstId(rec, [
        "id",
        "enrollment",
        "enrollment_number",
        "enrollmentNo",
        "admission",
        "admissionNo",
      ]) || undefined,
    exact: rec.exact === true || rec.exact === 1 || rec.exact === "1",
    toFees: rec.to === "fees" || rec.toFees === true || rec.to_fees === true,
  };
  if (
    !parsed.q &&
    !parsed.firstName &&
    !parsed.lastName &&
    !parsed.phone &&
    !parsed.email &&
    !parsed.id
  ) {
    throw validationError({ q: "required" });
  }
  return parsed;
}

function asNonNegNumber(value: unknown, field: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw validationError({ [field]: "invalid" });
  return n;
}

export function parseLateFeeRule(input: unknown) {
  const rec = asRecord(input, "name");
  const name = firstId(rec, ["name"]);
  const afterRaw = rec.afterDays ?? rec.after_days;
  const kindRaw = trim(rec.kind).toLowerCase();
  const kind = kindRaw === "percent" ? "percent" : kindRaw === "fixed" ? "fixed" : "";
  if (!name) throw validationError({ name: "required" });
  if (afterRaw === undefined || afterRaw === null || afterRaw === "") {
    throw validationError({ afterDays: "required" });
  }
  if (!kind) throw validationError({ kind: "required" });
  if (rec.value === undefined || rec.value === null || rec.value === "") {
    throw validationError({ value: "required" });
  }
  const afterDays = asNonNegNumber(afterRaw, "afterDays");
  if (!Number.isInteger(afterDays)) throw validationError({ afterDays: "invalid" });
  return {
    name,
    afterDays,
    kind: kind as "percent" | "fixed",
    value: asNonNegNumber(rec.value, "value"),
  };
}

export function attachLateFeeRules<T extends { afterDays: number }>(rows: T[]) {
  return rows.map((row) => ({ ...row, after_days: row.afterDays }));
}

export function parseLateFeeRulePatch(input: unknown) {
  const rec = asRecord(input, "rule");
  const name = firstId(rec, ["name"]) || undefined;
  const afterRaw = rec.afterDays ?? rec.after_days;
  const kindRaw = trim(rec.kind).toLowerCase();
  const kind =
    kindRaw === "percent" ? "percent" : kindRaw === "fixed" ? "fixed" : undefined;
  const hasAfter = afterRaw !== undefined && afterRaw !== null && afterRaw !== "";
  const hasValue = rec.value !== undefined && rec.value !== null && rec.value !== "";
  const patch = {
    name,
    afterDays: hasAfter ? asNonNegNumber(afterRaw, "afterDays") : undefined,
    kind: kind as "percent" | "fixed" | undefined,
    value: hasValue ? asNonNegNumber(rec.value, "value") : undefined,
  };
  if (patch.afterDays !== undefined && !Number.isInteger(patch.afterDays)) {
    throw validationError({ afterDays: "invalid" });
  }
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ rule: "required" });
  }
  return patch;
}

export function parseFeeTemplatePatch(input: unknown) {
  const rec = asRecord(input, "template");
  const sessionId =
    firstId(rec, ["sessionId", "session_id", "academic_year_id", "academicYearId"]) ||
    undefined;
  const groupId =
    firstId(rec, ["groupId", "group_id", "fee_group_id"]) || undefined;
  const hasDue = rec.dueDate !== undefined || rec.due_date !== undefined;
  const hasActive = rec.isActive !== undefined || rec.is_active !== undefined;
  const activeRaw = rec.isActive ?? rec.is_active;
  const patch = {
    sessionId,
    groupId,
    dueDate: hasDue ? firstId(rec, ["dueDate", "due_date"]) || null : undefined,
    isActive:
      !hasActive
        ? undefined
        : activeRaw === true || activeRaw === 1 || activeRaw === "1" || activeRaw === "true"
          ? true
          : activeRaw === false ||
              activeRaw === 0 ||
              activeRaw === "0" ||
              activeRaw === "false"
            ? false
            : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ template: "required" });
  }
  return patch;
}

export function parseDiscountType(input: unknown) {
  const rec = asRecord(input, "name");
  const name = firstId(rec, ["name"]);
  const kindRaw = trim(rec.kind).toLowerCase();
  const kind = kindRaw === "percent" ? "percent" : kindRaw === "fixed" ? "fixed" : "";
  if (!name) throw validationError({ name: "required" });
  if (!kind) throw validationError({ kind: "required" });
  const percentageRaw = rec.percentage;
  const amountRaw = rec.amount;
  return {
    name,
    code: firstId(rec, ["code"]) || undefined,
    kind: kind as "percent" | "fixed",
    percentage:
      percentageRaw === undefined || percentageRaw === null || percentageRaw === ""
        ? undefined
        : asNonNegNumber(percentageRaw, "percentage"),
    amount:
      amountRaw === undefined || amountRaw === null || amountRaw === ""
        ? undefined
        : asNonNegNumber(amountRaw, "amount"),
    description: firstId(rec, ["description"]) || undefined,
  };
}

export function parseDiscountTypePatch(input: unknown) {
  const rec = asRecord(input, "discount");
  const name = firstId(rec, ["name"]) || undefined;
  const kindRaw = trim(rec.kind).toLowerCase();
  const kind =
    kindRaw === "percent" ? "percent" : kindRaw === "fixed" ? "fixed" : undefined;
  const percentageRaw = rec.percentage;
  const amountRaw = rec.amount;
  const patch = {
    name,
    code: rec.code !== undefined ? firstId(rec, ["code"]) || null : undefined,
    kind: kind as "percent" | "fixed" | undefined,
    percentage:
      percentageRaw === undefined || percentageRaw === null || percentageRaw === ""
        ? undefined
        : asNonNegNumber(percentageRaw, "percentage"),
    amount:
      amountRaw === undefined || amountRaw === null || amountRaw === ""
        ? undefined
        : asNonNegNumber(amountRaw, "amount"),
    description:
      rec.description !== undefined
        ? firstId(rec, ["description"]) || null
        : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ discount: "required" });
  }
  return patch;
}

export function parsePaymentRefund(input: unknown) {
  const rec = asRecord(input, "reason");
  const reason = trim(rec.reason);
  if (!reason) throw validationError({ reason: "required" });
  const amountRaw = rec.amount;
  const amount =
    amountRaw === undefined || amountRaw === null || amountRaw === ""
      ? undefined
      : Number(amountRaw);
  if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
    throw validationError({ amount: "must be positive" });
  }
  return { reason, amount };
}

export function parseChequeBounce(input: unknown) {
  const rec = asRecord(input, "reason");
  const reason = trim(rec.reason);
  if (!reason) throw validationError({ reason: "required" });
  return { reason };
}

export function attachFeeConcessions<
  T extends { studentId: string; discountId: string },
>(rows: T[]) {
  return rows.map((row) => ({
    ...row,
    student_id: row.studentId,
    discount_id: row.discountId,
  }));
}

export function parseFeeConcession(input: unknown) {
  const rec = asRecord(input, "studentId");
  const studentId = firstId(rec, ["studentId", "student_id"]);
  const discountId = firstId(rec, ["discountId", "discount_id"]);
  if (!studentId) throw validationError({ studentId: "required" });
  if (!discountId) throw validationError({ discountId: "required" });
  const hasNote = rec.note !== undefined;
  return {
    studentId,
    discountId,
    note: hasNote ? firstId(rec, ["note"]) : undefined,
  };
}

export function parseFeeConcessionPatch(input: unknown) {
  const rec = asRecord(input, "concession");
  const hasNote = rec.note !== undefined;
  const patch = {
    discountId: firstId(rec, ["discountId", "discount_id"]) || undefined,
    note: hasNote ? firstId(rec, ["note"]) : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ concession: "required" });
  }
  return patch;
}

export function parseEventQuery(search: { get(name: string): string | null }) {
  const from =
    search.get("from")?.trim() ||
    search.get("from_date")?.trim() ||
    search.get("start")?.trim() ||
    "";
  const to =
    search.get("to")?.trim() ||
    search.get("to_date")?.trim() ||
    search.get("end")?.trim() ||
    "";
  const classRaw =
    search.get("class_id")?.trim() || search.get("classId")?.trim() || "";
  return {
    from: from || undefined,
    to: to || undefined,
    classId: !classRaw ? undefined : classRaw === "none" ? null : classRaw,
  };
}

export function parseLibraryCenterPatch(input: unknown) {
  const rec = asRecord(input, "center");
  const name = firstId(rec, ["name"]);
  if (!name) throw validationError({ name: "required" });
  return { name };
}

function attendanceBook(raw: string) {
  const book = raw.trim().toLowerCase();
  if (book === "staff" || book === "teacher") return "staff" as const;
  return "class" as const;
}

const ATTENDANCE_STATUS: Record<string, string> = {
  present: "PRESENT",
  absent: "ABSENT",
  late: "LATE",
  half_day: "HALFDAY",
  halfday: "HALFDAY",
  half: "HALFDAY",
  leave: "LEAVE",
  holiday: "HOLIDAY",
  not_taken: "",
  nottaken: "",
};

export function parseAttendanceStatus(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  const raw = trim(value);
  const mapped = ATTENDANCE_STATUS[raw.toLowerCase()];
  if (mapped !== undefined) return mapped;
  const upper = raw.toUpperCase();
  if (
    upper === "PRESENT" ||
    upper === "ABSENT" ||
    upper === "LATE" ||
    upper === "HALFDAY" ||
    upper === "LEAVE" ||
    upper === "HOLIDAY"
  ) {
    return upper;
  }
  throw validationError({ status: "invalid" });
}

export function parseAttendanceQuery(search: { get(name: string): string | null }) {
  const date =
    search.get("date")?.trim() || new Date().toISOString().slice(0, 10);
  const classId =
    search.get("class_id")?.trim() ||
    search.get("classId")?.trim() ||
    search.get("section_id")?.trim() ||
    search.get("sectionId")?.trim() ||
    "";
  return {
    book: attendanceBook(search.get("book") ?? "class"),
    date,
    classId: classId || undefined,
    subjectId:
      search.get("subject_id")?.trim() ||
      search.get("subjectId")?.trim() ||
      undefined,
  };
}

export function parseAttendanceDay(input: unknown) {
  const rec = asRecord(input, "date");
  const date = firstId(rec, ["date"]);
  if (!date) throw validationError({ date: "required" });
  const book = attendanceBook(firstId(rec, ["book"]) || "class");
  const classId =
    firstId(rec, ["classId", "class_id", "sectionId", "section_id"]) || undefined;
  if (book === "class" && !classId) throw validationError({ classId: "required" });
  const rawMarks = rec.marks ?? rec.entries;
  if (!Array.isArray(rawMarks) || !rawMarks.length) {
    throw validationError({ entries: "required" });
  }
  const entries = rawMarks.map((row) => {
    const item =
      row && typeof row === "object" && !Array.isArray(row)
        ? (row as Record<string, unknown>)
        : {};
    const studentId =
      firstId(item, ["studentId", "student_id", "person_id", "personId"]) ||
      undefined;
    const staffId = firstId(item, ["staffId", "staff_id"]) || undefined;
    const personId = book === "staff" ? staffId || studentId : studentId;
    if (!personId) throw validationError({ studentId: "required" });
    return {
      studentId: book === "class" ? personId : undefined,
      staffId: book === "staff" ? personId : undefined,
      status: parseAttendanceStatus(item.status),
      source: parseAttendanceSource(item.source),
      inTime: firstId(item, ["inTime", "in_time"]) || undefined,
      outTime: firstId(item, ["outTime", "out_time"]) || undefined,
    };
  });
  return {
    book,
    date,
    classId,
    subjectId: firstId(rec, ["subjectId", "subject_id"]) || undefined,
    override: rec.override === true,
    entries,
  };
}

export function parseDaycarePunch(input: unknown) {
  const rec = asRecord(input, "studentId");
  const studentId = firstId(rec, ["studentId", "student_id"]);
  if (!studentId) throw validationError({ studentId: "required" });
  return { studentId };
}

export function parseAttendanceMode(input: unknown) {
  const rec = asRecord(input, "name");
  const name = firstId(rec, ["name"]);
  if (!name) throw validationError({ name: "required" });
  return { id: firstId(rec, ["id"]) || undefined, name };
}

export function parseAttendanceModePatch(input: unknown) {
  const rec = asRecord(input, "mode");
  const name = firstId(rec, ["name"]);
  if (!name) throw validationError({ name: "required" });
  return { name };
}

export function parseAdmissionTest(input: unknown) {
  const rec = asRecord(input, "test");
  const name = firstId(rec, ["name"]);
  const date = firstId(rec, ["date"]);
  if (!name) throw validationError({ name: "required" });
  if (!date) throw validationError({ date: "required" });
  return {
    id: firstId(rec, ["id"]) || undefined,
    name,
    date,
    classId: firstId(rec, ["classId", "class_id"]) || undefined,
    venue: firstId(rec, ["venue"]) || undefined,
  };
}

export function parseAdmissionTestPatch(input: unknown) {
  const rec = asRecord(input, "test");
  const hasVenue = rec.venue !== undefined;
  const hasClass = rec.classId !== undefined || rec.class_id !== undefined;
  const patch = {
    name: firstId(rec, ["name"]) || undefined,
    date: firstId(rec, ["date"]) || undefined,
    classId: hasClass ? firstId(rec, ["classId", "class_id"]) : undefined,
    venue: hasVenue ? firstId(rec, ["venue"]) : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ test: "required" });
  }
  return patch;
}

const MESSAGE_BOXES = new Set(["inbox", "sent", "scheduled", "unseen"]);

export function parseMessageBox(value: string | null | undefined) {
  const box = trim(value).toLowerCase();
  if (box === "box" || !box) return "inbox";
  if (MESSAGE_BOXES.has(box)) return box as "inbox" | "sent" | "scheduled" | "unseen";
  return "inbox";
}

const MESSAGE_CATEGORIES: Record<string, string> = {
  fees: "Fees",
  transport: "Transport",
  academics: "Academics",
  uniforms: "Uniforms",
  library: "Library",
  others: "Others",
};

export function parseMessageCompose(input: unknown) {
  const rec = asRecord(input, "body");
  const body = trim(rec.body);
  if (!body) throw validationError({ body: "required" });
  const recipients = idList(rec, ["recipients", "recipient_ids"]);
  const categoryRaw = trim(rec.category);
  const category =
    MESSAGE_CATEGORIES[categoryRaw.toLowerCase()] || categoryRaw || undefined;
  const attachments = rec.attachments;
  const attachmentUrl = Array.isArray(attachments)
    ? trim(attachments[0])
    : firstId(rec, ["attachmentUrl", "attachment_url"]);
  return {
    body,
    studentId: firstId(rec, ["studentId", "student_id"]) || undefined,
    recipientUserId:
      firstId(rec, ["recipientUserId", "recipient_user_id"]) ||
      recipients[0] ||
      undefined,
    classId: firstId(rec, ["classId", "class_id"]) || undefined,
    category,
    hashTag: firstId(rec, ["hashTag", "hashtag", "tag"]) || undefined,
    attachmentUrl: attachmentUrl || undefined,
    scheduledAt:
      firstId(rec, ["scheduledAt", "scheduled_at", "deliver_at", "deliverAt"]) ||
      undefined,
  };
}

export function parseMessageReply(input: unknown) {
  const rec = asRecord(input, "body");
  const body = trim(rec.body);
  if (!body) throw validationError({ body: "required" });
  return { body };
}

export function parseMessagePolicies(input: unknown) {
  const rec = asRecord(input, "roles");
  const roles = idList(rec, ["roles", "blocked"]);
  return { roles };
}

export function parseBroadcastList(input: unknown) {
  const rec = asRecord(input, "name");
  const name = firstId(rec, ["name"]);
  if (!name) throw validationError({ name: "required" });
  const studentIds = idList(rec, ["studentIds", "student_ids"]);
  const staffIds = idList(rec, ["staffIds", "staff_ids"]);
  if (!studentIds.length && !staffIds.length) {
    throw validationError({ members: "required" });
  }
  return {
    id: firstId(rec, ["id"]) || undefined,
    name,
    studentIds,
    staffIds,
  };
}

export function parseBroadcastMembers(input: unknown) {
  const rec = asRecord(input, "studentIds");
  const studentIds = idList(rec, ["studentIds", "student_ids", "members"]);
  const staffIds = idList(rec, ["staffIds", "staff_ids"]);
  if (!studentIds.length && !staffIds.length) {
    throw validationError({ members: "required" });
  }
  return { studentIds, staffIds };
}

export function parseFormTemplate(input: unknown) {
  const rec = asRecord(input, "name");
  const name = firstId(rec, ["name"]);
  if (!name) throw validationError({ name: "required" });
  const kindRaw = trim(rec.kind).toLowerCase();
  const statusRaw = trim(rec.status).toLowerCase();
  return {
    id: firstId(rec, ["id"]) || undefined,
    name,
    kind: kindRaw === "enquiry" ? "enquiry" : "admission",
    status: statusRaw === "hidden" ? "hidden" : "open",
    belongTo: firstId(rec, ["belongTo", "belong_to"]) || undefined,
    opensAt:
      firstId(rec, ["opensAt", "opens_at", "start_date", "from"]) || null,
    closesAt: firstId(rec, ["closesAt", "closes_at", "end_date", "to"]) || null,
  };
}

export function parseFormTemplatePatch(input: unknown) {
  const rec = asRecord(input, "form");
  const name = firstId(rec, ["name"]) || undefined;
  const kindRaw = trim(rec.kind).toLowerCase();
  const statusRaw = trim(rec.status).toLowerCase();
  const hasOpens =
    rec.opensAt !== undefined ||
    rec.opens_at !== undefined ||
    rec.start_date !== undefined ||
    rec.from !== undefined;
  const hasCloses =
    rec.closesAt !== undefined ||
    rec.closes_at !== undefined ||
    rec.end_date !== undefined ||
    rec.to !== undefined;
  const patch = {
    name,
    kind:
      kindRaw === "enquiry"
        ? ("enquiry" as const)
        : kindRaw === "admission"
          ? ("admission" as const)
          : undefined,
    status:
      statusRaw === "hidden"
        ? ("hidden" as const)
        : statusRaw === "open"
          ? ("open" as const)
          : undefined,
    belongTo: firstId(rec, ["belongTo", "belong_to"]) || undefined,
    opensAt: hasOpens
      ? firstId(rec, ["opensAt", "opens_at", "start_date", "from"]) || null
      : undefined,
    closesAt: hasCloses
      ? firstId(rec, ["closesAt", "closes_at", "end_date", "to"]) || null
      : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ form: "required" });
  }
  return patch;
}

export function parseOpenForm(input: unknown) {
  const rec = asRecord(input, "id");
  const id = firstId(rec, ["id", "form_id", "formId", "template_id"]);
  if (!id) throw validationError({ id: "required" });
  const hidden = rec.hidden === true || trim(rec.status).toLowerCase() === "hidden";
  return {
    id,
    status: hidden ? ("hidden" as const) : ("open" as const),
    opensAt: firstId(rec, ["opensAt", "opens_at"]) || undefined,
    closesAt: firstId(rec, ["closesAt", "closes_at"]) || undefined,
  };
}

export function parseConvertToStudent(input: unknown) {
  const rec = asRecord(input, "classId");
  const classId = firstId(rec, ["classId", "class_id"]);
  if (!classId) throw validationError({ classId: "required" });
  const sectionId = firstId(rec, ["sectionId", "section_id"]) || classId;
  return {
    classId,
    sectionId,
    admissionNo: firstId(rec, ["admissionNo", "admission_no"]) || undefined,
    sessionId:
      firstId(rec, ["sessionId", "session_id", "academic_year_id", "academicYearId"]) ||
      undefined,
  };
}

function asBool(value: unknown) {
  if (value === true || value === 1) return true;
  const raw = trim(value).toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function vehicleExtraFields(rec: Record<string, unknown>) {
  const capacityRaw = rec.capacity;
  return {
    capacity:
      capacityRaw === undefined || capacityRaw === null || capacityRaw === ""
        ? undefined
        : asNonNegNumber(capacityRaw, "capacity"),
    trackerId: firstId(rec, ["trackerId", "tracker_id"]) || undefined,
    cctv: rec.cctv === undefined || rec.cctv === null || rec.cctv === ""
      ? undefined
      : asBool(rec.cctv),
    taxDue: firstId(rec, ["taxDue", "tax_due"]) || undefined,
    permitDue: firstId(rec, ["permitDue", "permit_due"]) || undefined,
    driverId: firstId(rec, ["driverId", "driver_id"]) || undefined,
    caretakerId: firstId(rec, ["caretakerId", "caretaker_id"]) || undefined,
    fuelType: firstId(rec, ["fuelType", "fuel_type"]) || undefined,
  };
}

export function parseVehicle(input: unknown) {
  const rec = asRecord(input, "registrationNo");
  const registrationNo = firstId(rec, [
    "registrationNo",
    "registration_no",
    "registration",
  ]);
  if (!registrationNo) throw validationError({ registrationNo: "required" });
  return {
    registrationNo,
    routeId: firstId(rec, ["routeId", "route_id"]) || undefined,
    insuranceDue: firstId(rec, ["insuranceDue", "insurance_due"]) || undefined,
    fitnessDue: firstId(rec, ["fitnessDue", "fitness_due"]) || undefined,
    pucDue: firstId(rec, ["pucDue", "puc_due"]) || undefined,
    ...vehicleExtraFields(rec),
  };
}

export function parseVehiclePatch(input: unknown) {
  const rec = asRecord(input, "vehicle");
  const registrationNo =
    firstId(rec, ["registrationNo", "registration_no", "registration"]) || undefined;
  const hasRoute = rec.routeId !== undefined || rec.route_id !== undefined;
  const routeRaw = rec.routeId ?? rec.route_id;
  const routeId = !hasRoute
    ? undefined
    : routeRaw === null || trim(routeRaw) === "" || trim(routeRaw) === "none"
      ? null
      : firstId(rec, ["routeId", "route_id"]);
  const extras = vehicleExtraFields(rec);
  const patch = {
    registrationNo,
    routeId,
    insuranceDue: firstId(rec, ["insuranceDue", "insurance_due"]) || undefined,
    fitnessDue: firstId(rec, ["fitnessDue", "fitness_due"]) || undefined,
    pucDue: firstId(rec, ["pucDue", "puc_due"]) || undefined,
    ...extras,
  };
  const hasValue = Object.values(patch).some((value) => value !== undefined);
  if (!hasValue) throw validationError({ vehicle: "required" });
  return patch;
}

export function parseRoute(input: unknown) {
  const rec = asRecord(input, "name");
  const name = firstId(rec, ["name"]);
  if (!name) throw validationError({ name: "required" });
  const feeRaw = rec.feeAmount ?? rec.fee_amount;
  if (feeRaw === undefined || feeRaw === null || feeRaw === "") {
    throw validationError({ feeAmount: "required" });
  }
  const pickups = idList(rec, ["pickups", "stops"]);
  const stopRows = rec.stops;
  const named =
    pickups.length > 0
      ? pickups
      : Array.isArray(stopRows)
        ? stopRows
            .map((row) =>
              typeof row === "string"
                ? trim(row)
                : row && typeof row === "object"
                  ? trim((row as Record<string, unknown>).name)
                  : "",
            )
            .filter(Boolean)
        : [];
  return {
    name,
    feeAmount: asNonNegNumber(feeRaw, "feeAmount"),
    pickups: named,
  };
}

export function parseReportTemplate(
  input: unknown,
):
  | { templateId: string; sectionId: string }
  | { name: string; body: string; sectionId?: string } {
  const rec = asRecord(input, "name");
  const templateId = firstId(rec, ["templateId", "template_id"]);
  const sectionId = firstId(rec, ["sectionId", "section_id"]);
  if (templateId && sectionId) return { templateId, sectionId };
  const name = firstId(rec, ["name"]);
  const body = firstId(rec, ["body"]);
  if (!name) throw validationError({ name: "required" });
  if (!body) throw validationError({ body: "required" });
  return {
    name,
    body,
    sectionId: sectionId || undefined,
  };
}

export function parseReportTemplatePatch(input: unknown) {
  const rec = asRecord(input, "template");
  const name = firstId(rec, ["name"]) || undefined;
  const hasBody = rec.body !== undefined;
  const patch = {
    name,
    body: hasBody ? firstId(rec, ["body"]) : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ template: "required" });
  }
  return patch;
}

export function parseDepositSlipPatch(input: unknown) {
  const rec = asRecord(input, "slip");
  const hasDate = rec.depositedAt !== undefined || rec.deposited_at !== undefined;
  const hasNote = rec.note !== undefined;
  const hasRef = rec.accountRef !== undefined || rec.account_ref !== undefined;
  const patch = {
    depositedAt: hasDate
      ? firstId(rec, ["depositedAt", "deposited_at"]) || undefined
      : undefined,
    bankName: firstId(rec, ["bankName", "bank_name"]) || undefined,
    accountRef: hasRef ? firstId(rec, ["accountRef", "account_ref"]) : undefined,
    note: hasNote ? firstId(rec, ["note"]) : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ slip: "required" });
  }
  return patch;
}

export function parseEventPatch(input: unknown) {
  const rec = asRecord(input, "event");
  const hasBody = rec.body !== undefined;
  const hasClass = rec.classId !== undefined || rec.class_id !== undefined;
  const hasEnds = rec.endsAt !== undefined || rec.ends_at !== undefined;
  const classRaw = firstId(rec, ["classId", "class_id"]);
  const endsRaw = firstId(rec, ["endsAt", "ends_at"]);
  const patch = {
    title: firstId(rec, ["title"]) || undefined,
    body: hasBody ? firstId(rec, ["body"]) || null : undefined,
    classId: !hasClass
      ? undefined
      : !classRaw || classRaw === "none"
        ? null
        : classRaw,
    startsAt: firstId(rec, ["startsAt", "starts_at"]) || undefined,
    endsAt: !hasEnds ? undefined : endsRaw || null,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ event: "required" });
  }
  return patch;
}

export function parseLeaveMarkPercentPatch(input: unknown) {
  const rec = asRecord(input, "percent");
  const leaveTypeId = firstId(rec, ["leaveTypeId", "leave_type_id"]) || undefined;
  const hasPercent = rec.percent !== undefined && rec.percent !== null && rec.percent !== "";
  const patch = {
    leaveTypeId,
    percent: hasPercent ? asNonNegNumber(rec.percent, "percent") : undefined,
  };
  if (patch.percent !== undefined && (patch.percent < 0 || patch.percent > 100)) {
    throw validationError({ percent: "must be 0-100" });
  }
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ percent: "required" });
  }
  return patch;
}

export function parseClassReportTemplate(input: unknown) {
  const rec = asRecord(input, "templateId");
  const templateId = firstId(rec, ["templateId", "template_id"]);
  if (!templateId) throw validationError({ templateId: "required" });
  return { templateId };
}

export function parseFuelLog(input: unknown) {
  const rec = asRecord(input, "vehicleId");
  const vehicleId = firstId(rec, ["vehicleId", "vehicle_id"]);
  if (!vehicleId) throw validationError({ vehicleId: "required" });
  if (rec.litres === undefined || rec.litres === null || rec.litres === "") {
    throw validationError({ litres: "required" });
  }
  return {
    vehicleId,
    litres: asNonNegNumber(rec.litres, "litres"),
    amount:
      rec.amount === undefined || rec.amount === null || rec.amount === ""
        ? undefined
        : asNonNegNumber(rec.amount, "amount"),
    odometer:
      rec.odometer === undefined || rec.odometer === null || rec.odometer === ""
        ? undefined
        : asNonNegNumber(rec.odometer, "odometer"),
    at: firstId(rec, ["at", "date"]) || undefined,
    note: firstId(rec, ["note"]) || undefined,
  };
}

export function parseTransportSlab(input: unknown) {
  const rec = asRecord(input, "name");
  const name = firstId(rec, ["name"]);
  if (!name) throw validationError({ name: "required" });
  const fromRaw = rec.fromKm ?? rec.from_km;
  const amountRaw = rec.amount;
  if (fromRaw === undefined || fromRaw === null || fromRaw === "") {
    throw validationError({ fromKm: "required" });
  }
  if (amountRaw === undefined || amountRaw === null || amountRaw === "") {
    throw validationError({ amount: "required" });
  }
  const toRaw = rec.toKm ?? rec.to_km;
  return {
    id: firstId(rec, ["id"]) || undefined,
    name,
    fromKm: asNonNegNumber(fromRaw, "fromKm"),
    toKm:
      toRaw === undefined || toRaw === null || toRaw === ""
        ? undefined
        : asNonNegNumber(toRaw, "toKm"),
    amount: asNonNegNumber(amountRaw, "amount"),
  };
}

function namedPickups(rec: Record<string, unknown>) {
  const pickups = idList(rec, ["pickups"]);
  if (pickups.length > 0) return pickups;
  const stopRows = rec.stops;
  if (!Array.isArray(stopRows)) return [];
  return stopRows
    .map((row) =>
      typeof row === "string"
        ? trim(row)
        : row && typeof row === "object"
          ? trim((row as Record<string, unknown>).name)
          : "",
    )
    .filter(Boolean);
}

export function parseFuelLogPatch(input: unknown) {
  const rec = asRecord(input, "fuelLog");
  const vehicleId = firstId(rec, ["vehicleId", "vehicle_id"]) || undefined;
  const hasLitres = rec.litres !== undefined && rec.litres !== null && rec.litres !== "";
  const hasAmount = rec.amount !== undefined && rec.amount !== null && rec.amount !== "";
  const hasOdo = rec.odometer !== undefined;
  const at = firstId(rec, ["at", "date"]) || undefined;
  const hasNote = rec.note !== undefined;
  const patch = {
    vehicleId,
    litres: hasLitres ? asNonNegNumber(rec.litres, "litres") : undefined,
    amount: hasAmount ? asNonNegNumber(rec.amount, "amount") : undefined,
    odometer: !hasOdo
      ? undefined
      : rec.odometer === null || rec.odometer === ""
        ? null
        : asNonNegNumber(rec.odometer, "odometer"),
    at,
    note: hasNote ? firstId(rec, ["note"]) : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ fuelLog: "required" });
  }
  return patch;
}

export function parseTransportSlabPatch(input: unknown) {
  const rec = asRecord(input, "slab");
  const name = firstId(rec, ["name"]) || undefined;
  const fromRaw = rec.fromKm ?? rec.from_km;
  const amountRaw = rec.amount;
  const hasTo = rec.toKm !== undefined || rec.to_km !== undefined;
  const toRaw = rec.toKm ?? rec.to_km;
  const patch = {
    name,
    fromKm:
      fromRaw === undefined || fromRaw === null || fromRaw === ""
        ? undefined
        : asNonNegNumber(fromRaw, "fromKm"),
    toKm: !hasTo
      ? undefined
      : toRaw === null || toRaw === ""
        ? null
        : asNonNegNumber(toRaw, "toKm"),
    amount:
      amountRaw === undefined || amountRaw === null || amountRaw === ""
        ? undefined
        : asNonNegNumber(amountRaw, "amount"),
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ slab: "required" });
  }
  return patch;
}

export function parseRoutePatch(input: unknown) {
  const rec = asRecord(input, "route");
  const name = firstId(rec, ["name"]) || undefined;
  const feeRaw = rec.feeAmount ?? rec.fee_amount;
  const hasFee = feeRaw !== undefined && feeRaw !== null && feeRaw !== "";
  const hasPickups = rec.pickups !== undefined || rec.stops !== undefined;
  const patch = {
    name,
    feeAmount: hasFee ? asNonNegNumber(feeRaw, "feeAmount") : undefined,
    pickups: hasPickups ? namedPickups(rec) : undefined,
  };
  if (!patch.name && patch.feeAmount === undefined && patch.pickups === undefined) {
    throw validationError({ route: "required" });
  }
  return patch;
}

export function parseLeaveMarkPercent(input: unknown) {
  const rec = asRecord(input, "leaveTypeId");
  const leaveTypeId = firstId(rec, ["leaveTypeId", "leave_type_id"]);
  if (!leaveTypeId) throw validationError({ leaveTypeId: "required" });
  if (rec.percent === undefined || rec.percent === null || rec.percent === "") {
    throw validationError({ percent: "required" });
  }
  const id = firstId(rec, ["id"]);
  return {
    ...(id ? { id } : {}),
    leaveTypeId,
    percent: asNonNegNumber(rec.percent, "percent"),
  };
}

export function parseStoreKit(input: unknown) {
  const rec = asRecord(input, "name");
  const name = firstId(rec, ["name"]);
  if (!name) throw validationError({ name: "required" });
  const priceRaw = rec.price;
  const stockRaw = rec.stock;
  return {
    name,
    sku: firstId(rec, ["sku"]) || undefined,
    price:
      priceRaw === undefined || priceRaw === null || priceRaw === ""
        ? undefined
        : asNonNegNumber(priceRaw, "price"),
    vendor: firstId(rec, ["vendor"]) || undefined,
    stock:
      stockRaw === undefined || stockRaw === null || stockRaw === ""
        ? undefined
        : asNonNegNumber(stockRaw, "stock"),
    unit: firstId(rec, ["unit"]) || undefined,
    type: "kit" as const,
  };
}

export function parseStoreDelivery(input: unknown) {
  const rec = asRecord(input, "orderId");
  const orderId = firstId(rec, ["orderId", "order_id"]);
  if (!orderId) throw validationError({ orderId: "required" });
  return { orderId };
}

const STORE_PRODUCT_PATCH_TYPES = new Set(["product", "kit", "uniform", "bundle"]);

export function parseLibraryTitle(input: unknown) {
  const rec = asRecord(input, "title");
  const title = firstId(rec, ["title", "name"]);
  if (!title) throw validationError({ title: "required" });
  const qtyRaw = rec.qty ?? rec.quantity ?? rec.copies;
  if (qtyRaw === undefined || qtyRaw === null || qtyRaw === "") {
    throw validationError({ qty: "required" });
  }
  const qty = asNonNegNumber(qtyRaw, "qty");
  if (!Number.isInteger(qty) || qty < 1) {
    throw validationError({ qty: "must be at least 1" });
  }
  const priceRaw = rec.price;
  return {
    title,
    isbn: firstId(rec, ["isbn"]) || undefined,
    author: firstId(rec, ["author"]) || undefined,
    publisher: firstId(rec, ["publisher"]) || undefined,
    qty,
    rack: firstId(rec, ["rack"]) || undefined,
    price:
      priceRaw === undefined || priceRaw === null || priceRaw === ""
        ? undefined
        : asNonNegNumber(priceRaw, "price"),
  };
}

export function parseLibraryTitlePatch(input: unknown) {
  const rec = asRecord(input, "title");
  const hasTitle = rec.title !== undefined || rec.name !== undefined;
  const hasIsbn = rec.isbn !== undefined;
  const hasAuthor = rec.author !== undefined;
  const hasPublisher = rec.publisher !== undefined;
  const hasRack = rec.rack !== undefined;
  const qtyRaw = rec.qty ?? rec.quantity ?? rec.copies;
  const hasQty = qtyRaw !== undefined && qtyRaw !== null && qtyRaw !== "";
  const hasPrice = rec.price !== undefined && rec.price !== null && rec.price !== "";
  const title = firstId(rec, ["title", "name"]);
  if (hasTitle && !title) throw validationError({ title: "required" });
  const qty = hasQty ? asNonNegNumber(qtyRaw, "qty") : undefined;
  if (qty !== undefined && (!Number.isInteger(qty) || qty < 1)) {
    throw validationError({ qty: "must be at least 1" });
  }
  const patch = {
    title: hasTitle ? title : undefined,
    isbn: hasIsbn ? firstId(rec, ["isbn"]) : undefined,
    author: hasAuthor ? firstId(rec, ["author"]) : undefined,
    publisher: hasPublisher ? firstId(rec, ["publisher"]) : undefined,
    qty,
    rack: hasRack ? firstId(rec, ["rack"]) : undefined,
    price: hasPrice ? asNonNegNumber(rec.price, "price") : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ title: "required" });
  }
  return patch;
}

export function parseStoreProductPatch(input: unknown) {
  const rec = asRecord(input, "product");
  const hasName = rec.name !== undefined;
  const hasSku = rec.sku !== undefined;
  const hasVendor = rec.vendor !== undefined;
  const hasUnit = rec.unit !== undefined;
  const hasPrice = rec.price !== undefined && rec.price !== null && rec.price !== "";
  const hasType = rec.type !== undefined && rec.type !== null && rec.type !== "";
  const name = firstId(rec, ["name"]);
  if (hasName && !name) throw validationError({ name: "required" });
  const typeRaw = firstId(rec, ["type"]);
  if (hasType && !STORE_PRODUCT_PATCH_TYPES.has(typeRaw)) {
    throw validationError({ type: "invalid" });
  }
  const patch = {
    name: hasName ? name : undefined,
    sku: hasSku ? firstId(rec, ["sku"]) : undefined,
    price: hasPrice ? asNonNegNumber(rec.price, "price") : undefined,
    type: hasType ? (typeRaw as "product" | "kit" | "uniform" | "bundle") : undefined,
    vendor: hasVendor ? firstId(rec, ["vendor"]) : undefined,
    unit: hasUnit ? firstId(rec, ["unit"]) : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ product: "required" });
  }
  return patch;
}

export function parseStoreKitPatch(input: unknown) {
  return { ...parseStoreProductPatch(input), type: "kit" as const };
}

export function parseDriverPatch(input: unknown) {
  const rec = asRecord(input, "driver");
  const hasLast = rec.lastName !== undefined || rec.last_name !== undefined;
  const hasPhone = rec.phone !== undefined;
  const hasEmail = rec.email !== undefined;
  const hasExpiry =
    rec.licenseExpiry !== undefined || rec.license_expiry !== undefined;
  const patch = {
    employeeId: firstId(rec, ["employeeId", "employee_id"]) || undefined,
    firstName: firstId(rec, ["firstName", "first_name"]) || undefined,
    lastName: hasLast ? firstId(rec, ["lastName", "last_name"]) : undefined,
    phone: hasPhone ? firstId(rec, ["phone"]) : undefined,
    email: hasEmail ? firstId(rec, ["email"]) : undefined,
    licenseNo: firstId(rec, ["licenseNo", "license_no"]) || undefined,
    licenseExpiry: hasExpiry
      ? firstId(rec, ["licenseExpiry", "license_expiry"])
      : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ driver: "required" });
  }
  return patch;
}

export function parseCorporatePatch(input: unknown) {
  const rec = asRecord(input, "corporate");
  const name = firstId(rec, ["name"]);
  if (!name) throw validationError({ name: "required" });
  return { name };
}

export function parseOrgMasterPatch(input: unknown) {
  const rec = asRecord(input, "master");
  const hasName = rec.name !== undefined;
  const hasCode = rec.code !== undefined;
  const name = hasName ? firstId(rec, ["name"]) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  const patch = {
    name,
    code: hasCode ? firstId(rec, ["code"]) : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ master: "required" });
  }
  return patch;
}

export function parseClassTeacherPatch(input: unknown) {
  const rec = asRecord(input, "classTeacher");
  const hasStaff = rec.staffId !== undefined || rec.staff_id !== undefined;
  if (!hasStaff) throw validationError({ staffId: "required" });
  return { staffId: firstId(rec, ["staffId", "staff_id"]) || null };
}

export function parseClassFlagsPatch(input: unknown) {
  const rec = asRecord(input, "flags");
  const hasSms = rec.sendAbsentSms !== undefined || rec.send_absent_sms !== undefined;
  const hasVirtual =
    rec.virtualClassroom !== undefined || rec.virtual_classroom !== undefined;
  const patch = {
    sendAbsentSms: hasSms
      ? asBool(rec.sendAbsentSms ?? rec.send_absent_sms)
      : undefined,
    virtualClassroom: hasVirtual
      ? asBool(rec.virtualClassroom ?? rec.virtual_classroom)
      : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ flags: "required" });
  }
  return patch;
}

export function parseSessionPrefixPatch(input: unknown) {
  const rec = asRecord(input, "prefix");
  const hasReceipt =
    rec.receiptPrefix !== undefined || rec.receipt_prefix !== undefined;
  const hasInvoice =
    rec.invoicePrefix !== undefined || rec.invoice_prefix !== undefined;
  const hasAdmission =
    rec.admissionPrefix !== undefined || rec.admission_prefix !== undefined;
  const hasFirst =
    rec.firstAdmissionNo !== undefined || rec.first_admission_no !== undefined;
  let firstAdmissionNo: number | undefined;
  if (hasFirst) {
    const n = Number(rec.firstAdmissionNo ?? rec.first_admission_no);
    if (!Number.isFinite(n)) throw validationError({ firstAdmissionNo: "number" });
    firstAdmissionNo = Math.floor(n);
  }
  const patch = {
    receiptPrefix: hasReceipt
      ? String(rec.receiptPrefix ?? rec.receipt_prefix ?? "")
      : undefined,
    invoicePrefix: hasInvoice
      ? String(rec.invoicePrefix ?? rec.invoice_prefix ?? "")
      : undefined,
    admissionPrefix: hasAdmission
      ? String(rec.admissionPrefix ?? rec.admission_prefix ?? "")
      : undefined,
    firstAdmissionNo,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ prefix: "required" });
  }
  return patch;
}

const EXAM_KINDS = new Set([
  "GENERAL_PASS_FAIL",
  "SCHOOL_GRADE",
  "COLLEGE_GRADE",
  "GPA",
  "AVERAGE_PASSING",
]);

export function parseExamGroupPatch(input: unknown) {
  const rec = asRecord(input, "examGroup");
  const hasName = rec.name !== undefined;
  const hasType = rec.examType !== undefined || rec.exam_type !== undefined;
  const hasKind = rec.groupKind !== undefined || rec.group_kind !== undefined;
  const hasSession = rec.sessionId !== undefined || rec.session_id !== undefined;
  const hasStart = rec.startDate !== undefined || rec.start_date !== undefined;
  const hasEnd = rec.endDate !== undefined || rec.end_date !== undefined;
  const hasMonth =
    rec.examMonthYear !== undefined || rec.exam_month_year !== undefined;
  const hasAdditional =
    rec.isAdditional !== undefined || rec.is_additional !== undefined;
  const hasReval =
    rec.revaluationOn !== undefined || rec.revaluation_on !== undefined;
  const hasActive = rec.isActive !== undefined || rec.is_active !== undefined;
  const hasDesc = rec.description !== undefined;
  const name = hasName ? firstId(rec, ["name"]) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  const examTypeRaw = hasType ? firstId(rec, ["examType", "exam_type"]) : "";
  if (hasType && !EXAM_KINDS.has(examTypeRaw)) {
    throw validationError({ examType: "invalid" });
  }
  const patch = {
    name,
    examType: hasType
      ? (examTypeRaw as
          | "GENERAL_PASS_FAIL"
          | "SCHOOL_GRADE"
          | "COLLEGE_GRADE"
          | "GPA"
          | "AVERAGE_PASSING")
      : undefined,
    groupKind: hasKind ? firstId(rec, ["groupKind", "group_kind"]) : undefined,
    sessionId: hasSession ? firstId(rec, ["sessionId", "session_id"]) : undefined,
    startDate: hasStart ? firstId(rec, ["startDate", "start_date"]) : undefined,
    endDate: hasEnd ? firstId(rec, ["endDate", "end_date"]) : undefined,
    examMonthYear: hasMonth
      ? firstId(rec, ["examMonthYear", "exam_month_year"])
      : undefined,
    isAdditional: hasAdditional
      ? asBool(rec.isAdditional ?? rec.is_additional)
      : undefined,
    revaluationOn: hasReval
      ? asBool(rec.revaluationOn ?? rec.revaluation_on)
      : undefined,
    isActive: hasActive ? asBool(rec.isActive ?? rec.is_active) : undefined,
    description: hasDesc ? firstId(rec, ["description"]) : undefined,
  };
  if (hasSession && !patch.sessionId) throw validationError({ sessionId: "required" });
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ examGroup: "required" });
  }
  return patch;
}

export function parseCctvPatch(input: unknown) {
  const rec = asRecord(input, "camera");
  const hasName = rec.name !== undefined;
  const hasRoom = rec.room !== undefined;
  const hasUrl = rec.url !== undefined;
  const name = hasName ? firstId(rec, ["name"]) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  const url = hasUrl ? firstId(rec, ["url"]) : undefined;
  if (hasUrl) {
    try {
      if (!url || new URL(url).protocol !== "https:") {
        throw validationError({ url: "https required" });
      }
    } catch (error) {
      if (error && typeof error === "object" && "status" in error) throw error;
      throw validationError({ url: "https required" });
    }
  }
  const patch = {
    name,
    room: hasRoom ? firstId(rec, ["room"]) : undefined,
    url,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ camera: "required" });
  }
  return patch;
}

export function parseNamePatch(input: unknown) {
  const rec = asRecord(input, "name");
  const name = firstId(rec, ["name"]);
  if (!name) throw validationError({ name: "required" });
  return { name };
}

export function parseSubjectPatch(input: unknown) {
  const rec = asRecord(input, "subject");
  const hasName = rec.name !== undefined;
  const hasCode = rec.code !== undefined;
  const hasKind = rec.kind !== undefined;
  const hasOptional = rec.isOptional !== undefined || rec.is_optional !== undefined;
  const hasCategory = rec.categoryId !== undefined || rec.category_id !== undefined;
  const hasType = rec.typeId !== undefined || rec.type_id !== undefined;
  const hasParent =
    rec.parentSubjectId !== undefined || rec.parent_subject_id !== undefined;
  const name = hasName ? firstId(rec, ["name"]) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  const kind = hasKind ? firstId(rec, ["kind"]) : undefined;
  if (hasKind && !kind) throw validationError({ kind: "required" });
  const patch = {
    name,
    code: hasCode ? firstId(rec, ["code"]) : undefined,
    kind,
    isOptional: hasOptional
      ? rec.isOptional === true || rec.is_optional === true
      : undefined,
    categoryId: hasCategory ? firstId(rec, ["categoryId", "category_id"]) : undefined,
    typeId: hasType ? firstId(rec, ["typeId", "type_id"]) : undefined,
    parentSubjectId: hasParent
      ? firstId(rec, ["parentSubjectId", "parent_subject_id"])
      : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ subject: "required" });
  }
  return patch;
}

export function parseQuestionnairePatch(input: unknown) {
  const rec = asRecord(input, "questionnaire");
  const hasTitle = rec.title !== undefined || rec.name !== undefined;
  const hasType = rec.type !== undefined;
  const hasFrom = rec.validFrom !== undefined || rec.valid_from !== undefined;
  const hasTill = rec.validTill !== undefined || rec.valid_till !== undefined;
  const hasQuestions = rec.questions !== undefined;
  const title = firstId(rec, ["title", "name"]);
  if (hasTitle && !title) throw validationError({ title: "required" });
  let questions: Array<{ label: string; marks: number }> | undefined;
  if (hasQuestions) {
    if (!Array.isArray(rec.questions)) throw validationError({ questions: "invalid" });
    questions = rec.questions
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const q = row as Record<string, unknown>;
        const label = firstId(q, ["label"]);
        if (!label) return null;
        return { label, marks: asNonNegNumber(q.marks ?? 0, "marks") };
      })
      .filter((row): row is { label: string; marks: number } => Boolean(row));
  }
  const patch = {
    title: hasTitle ? title : undefined,
    type: hasType ? firstId(rec, ["type"]) : undefined,
    validFrom: hasFrom ? firstId(rec, ["validFrom", "valid_from"]) : undefined,
    validTill: hasTill ? firstId(rec, ["validTill", "valid_till"]) : undefined,
    questions,
  };
  if (
    patch.title === undefined &&
    patch.type === undefined &&
    patch.validFrom === undefined &&
    patch.validTill === undefined &&
    patch.questions === undefined
  ) {
    throw validationError({ questionnaire: "required" });
  }
  return patch;
}

export function parseLibraryAccession(input: unknown) {
  const rec = asRecord(input, "bookId");
  const bookId = firstId(rec, ["bookId", "book_id", "title_id"]);
  if (!bookId) throw validationError({ bookId: "required" });
  return { bookId };
}

export function parseLibraryAccessionPatch(input: unknown) {
  const rec = asRecord(input, "accession");
  const accessionNo = firstId(rec, ["accessionNo", "accession_no", "number"]);
  if (!accessionNo) throw validationError({ accessionNo: "required" });
  return { accessionNo };
}

export function parseLibraryCopyPatch(input: unknown) {
  const rec = asRecord(input, "copy");
  const hasQty =
    rec.qty !== undefined || rec.quantity !== undefined || rec.copies !== undefined;
  const hasReason = rec.reason !== undefined || rec.note !== undefined;
  let qty: number | undefined;
  if (hasQty) {
    qty = asNonNegNumber(rec.qty ?? rec.quantity ?? rec.copies, "qty");
    if (!Number.isInteger(qty) || qty < 1) {
      throw validationError({ qty: "must be at least 1" });
    }
  }
  const patch = {
    qty,
    reason: hasReason ? firstId(rec, ["reason", "note"]) : undefined,
  };
  if (patch.qty === undefined && patch.reason === undefined) {
    throw validationError({ copy: "required" });
  }
  return patch;
}

export function parseQuestionnaireAssign(input: unknown) {
  const rec = asRecord(input, "classId");
  const classId = firstId(rec, ["classId", "class_id"]);
  if (!classId) throw validationError({ classId: "required" });
  return {
    classId,
    opensAt:
      firstId(rec, ["opensAt", "opens_at", "validFrom", "valid_from"]) ||
      undefined,
    closesAt:
      firstId(rec, ["closesAt", "closes_at", "validTill", "valid_till"]) ||
      undefined,
  };
}

export function parseLibraryLost(input: unknown) {
  const rec = asRecord(input, "bookId");
  const bookId = firstId(rec, ["bookId", "book_id", "title_id"]);
  if (!bookId) throw validationError({ bookId: "required" });
  const qtyRaw = rec.qty ?? rec.quantity ?? rec.copies;
  if (qtyRaw === undefined || qtyRaw === null || qtyRaw === "") {
    throw validationError({ qty: "required" });
  }
  const qty = asNonNegNumber(qtyRaw, "qty");
  if (!Number.isInteger(qty) || qty < 1) {
    throw validationError({ qty: "must be at least 1" });
  }
  return {
    bookId,
    qty,
    reason: firstId(rec, ["reason", "note"]) || undefined,
  };
}

export function parseHousePatch(input: unknown) {
  const rec = asRecord(input, "house");
  const hasName = rec.name !== undefined;
  const hasColor = rec.color !== undefined;
  const hasDescription = rec.description !== undefined;
  const name = hasName ? firstId(rec, ["name"]) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  const patch = {
    name,
    color: hasColor ? firstId(rec, ["color"]) : undefined,
    description: hasDescription ? firstId(rec, ["description"]) : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ house: "required" });
  }
  return patch;
}

export function parseHostelPatch(input: unknown) {
  const rec = asRecord(input, "hostel");
  const hasName = rec.name !== undefined;
  const hasFee =
    rec.feeAmount !== undefined ||
    rec.fee_amount !== undefined ||
    rec.fee !== undefined;
  const name = hasName ? firstId(rec, ["name"]) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  const feeAmount = hasFee
    ? asNonNegNumber(rec.feeAmount ?? rec.fee_amount ?? rec.fee, "feeAmount")
    : undefined;
  const patch = { name, feeAmount };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ hostel: "required" });
  }
  return patch;
}

export function parseVisitorPatch(input: unknown) {
  const rec = asRecord(input, "visitor");
  const hasName = rec.name !== undefined;
  const hasPhone = rec.phone !== undefined;
  const hasPurpose = rec.purpose !== undefined;
  const hasToMeet = rec.toMeet !== undefined || rec.to_meet !== undefined;
  const hasNote = rec.note !== undefined;
  const name = hasName ? firstId(rec, ["name"]) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  const patch = {
    name,
    phone: hasPhone ? firstId(rec, ["phone"]) || null : undefined,
    purpose: hasPurpose ? firstId(rec, ["purpose"]) || null : undefined,
    toMeet: hasToMeet ? firstId(rec, ["toMeet", "to_meet"]) || null : undefined,
    note: hasNote ? firstId(rec, ["note"]) || null : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ visitor: "required" });
  }
  return patch;
}

export function parseExternalLinkPatch(input: unknown) {
  const rec = asRecord(input, "link");
  const hasTitle = rec.title !== undefined || rec.name !== undefined;
  const hasUrl = rec.url !== undefined;
  const title = hasTitle ? firstId(rec, ["title", "name"]) : undefined;
  if (hasTitle && !title) throw validationError({ title: "required" });
  const url = hasUrl ? firstId(rec, ["url"]) : undefined;
  if (hasUrl) {
    try {
      if (!url || new URL(url).protocol !== "https:") {
        throw validationError({ url: "https required" });
      }
    } catch (error) {
      if (error && typeof error === "object" && "status" in error) throw error;
      throw validationError({ url: "https required" });
    }
  }
  const patch = { title, url };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ link: "required" });
  }
  return patch;
}

export function parseMessageTemplatePatch(input: unknown) {
  const rec = asRecord(input, "template");
  const hasName = rec.name !== undefined;
  const hasChannel = rec.channel !== undefined;
  const hasSubject = rec.subject !== undefined;
  const hasBody = rec.body !== undefined;
  const name = hasName ? firstId(rec, ["name"]) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  const body = hasBody ? firstId(rec, ["body"]) : undefined;
  if (hasBody && !body) throw validationError({ body: "required" });
  let channel: "EMAIL" | "SMS" | undefined;
  if (hasChannel) {
    const raw = firstId(rec, ["channel"]).toUpperCase();
    if (raw !== "EMAIL" && raw !== "SMS") throw validationError({ channel: "invalid" });
    channel = raw;
  }
  const patch = {
    name,
    channel,
    subject: hasSubject ? firstId(rec, ["subject"]) || null : undefined,
    body,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ template: "required" });
  }
  return patch;
}

const PROGRAM_LEVELS = new Set([
  "UNDERGRADUATE",
  "POSTGRADUATE",
  "DIPLOMA",
  "CERTIFICATE",
]);

export function parseLiveClassPatch(input: unknown) {
  const rec = asRecord(input, "liveClass");
  const hasTitle = rec.title !== undefined;
  const hasMeeting = rec.meetingUrl !== undefined || rec.meeting_url !== undefined;
  const hasRecording =
    rec.recordingUrl !== undefined || rec.recording_url !== undefined;
  const hasStarts = rec.startsAt !== undefined || rec.starts_at !== undefined;
  const hasProvider = rec.provider !== undefined;
  const hasClass = rec.classId !== undefined || rec.class_id !== undefined;
  const hasSubject = rec.subjectId !== undefined || rec.subject_id !== undefined;
  const hasStaff = rec.staffId !== undefined || rec.staff_id !== undefined;
  const title = hasTitle ? firstId(rec, ["title"]) : undefined;
  if (hasTitle && !title) throw validationError({ title: "required" });
  const meetingUrl = hasMeeting ? firstId(rec, ["meetingUrl", "meeting_url"]) : undefined;
  if (hasMeeting && !meetingUrl) throw validationError({ meetingUrl: "required" });
  const recordingRaw = hasRecording
    ? firstId(rec, ["recordingUrl", "recording_url"])
    : undefined;
  let provider: "GMEET" | "ZOOM" | undefined;
  if (hasProvider) {
    const raw = firstId(rec, ["provider"]).toUpperCase();
    if (raw !== "GMEET" && raw !== "ZOOM") throw validationError({ provider: "invalid" });
    provider = raw;
  }
  const classRaw = hasClass ? firstId(rec, ["classId", "class_id"]) : "";
  const subjectRaw = hasSubject ? firstId(rec, ["subjectId", "subject_id"]) : "";
  const staffRaw = hasStaff ? firstId(rec, ["staffId", "staff_id"]) : "";
  const patch = {
    title,
    meetingUrl,
    recordingUrl: hasRecording ? recordingRaw || null : undefined,
    startsAt: hasStarts ? firstId(rec, ["startsAt", "starts_at"]) : undefined,
    provider,
    classId: hasClass ? classRaw || null : undefined,
    subjectId: hasSubject ? subjectRaw || null : undefined,
    staffId: hasStaff ? staffRaw || null : undefined,
  };
  if (hasStarts && !patch.startsAt) throw validationError({ startsAt: "required" });
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ liveClass: "required" });
  }
  return patch;
}

export function parseProgramPatch(input: unknown) {
  const rec = asRecord(input, "program");
  const hasName = rec.name !== undefined;
  const hasCode = rec.code !== undefined;
  const hasLevel = rec.level !== undefined;
  const hasDuration =
    rec.durationYears !== undefined || rec.duration_years !== undefined;
  const hasDepartment =
    rec.departmentId !== undefined || rec.department_id !== undefined;
  const name = hasName ? firstId(rec, ["name"]) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  let level: "UNDERGRADUATE" | "POSTGRADUATE" | "DIPLOMA" | "CERTIFICATE" | undefined;
  if (hasLevel) {
    const raw = firstId(rec, ["level"]).toUpperCase();
    if (!PROGRAM_LEVELS.has(raw)) throw validationError({ level: "invalid" });
    level = raw as typeof level;
  }
  let durationYears: number | undefined;
  if (hasDuration) {
    durationYears = asNonNegNumber(
      rec.durationYears ?? rec.duration_years,
      "durationYears",
    );
    if (!Number.isInteger(durationYears) || durationYears < 1) {
      throw validationError({ durationYears: "invalid" });
    }
  }
  const departmentId = hasDepartment
    ? firstId(rec, ["departmentId", "department_id"])
    : undefined;
  if (hasDepartment && !departmentId) throw validationError({ departmentId: "required" });
  const patch = {
    name,
    code: hasCode ? firstId(rec, ["code"]) || null : undefined,
    level,
    durationYears,
    departmentId,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ program: "required" });
  }
  return patch;
}

export function parseExamFormWindowPatch(input: unknown) {
  const rec = asRecord(input, "window");
  const hasKind = rec.kind !== undefined;
  const hasGroup = rec.examGroupId !== undefined || rec.exam_group_id !== undefined;
  const hasOpens = rec.opensAt !== undefined || rec.opens_at !== undefined;
  const hasCloses = rec.closesAt !== undefined || rec.closes_at !== undefined;
  const hasFee = rec.feeAmount !== undefined || rec.fee_amount !== undefined;
  const hasActive = rec.isActive !== undefined || rec.is_active !== undefined;
  let kind: "ATKT" | "REVAL" | undefined;
  if (hasKind) {
    const raw = firstId(rec, ["kind"]).toUpperCase();
    if (raw !== "ATKT" && raw !== "REVAL") throw validationError({ kind: "invalid" });
    kind = raw;
  }
  const examGroupId = hasGroup
    ? firstId(rec, ["examGroupId", "exam_group_id"])
    : undefined;
  if (hasGroup && !examGroupId) throw validationError({ examGroupId: "required" });
  const opensAt = hasOpens ? firstId(rec, ["opensAt", "opens_at"]) : undefined;
  const closesAt = hasCloses ? firstId(rec, ["closesAt", "closes_at"]) : undefined;
  if (hasOpens && !opensAt) throw validationError({ opensAt: "required" });
  if (hasCloses && !closesAt) throw validationError({ closesAt: "required" });
  const patch = {
    kind,
    examGroupId,
    opensAt,
    closesAt,
    feeAmount: hasFee
      ? asNonNegNumber(rec.feeAmount ?? rec.fee_amount, "feeAmount")
      : undefined,
    isActive: hasActive ? asBool(rec.isActive ?? rec.is_active) : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ window: "required" });
  }
  return patch;
}

export function parseExamFormPatch(input: unknown) {
  const rec = asRecord(input, "form");
  const hasSubjects = rec.subjectIds !== undefined || rec.subject_ids !== undefined;
  if (!hasSubjects) throw validationError({ subjectIds: "required" });
  const subjectIds = idList(rec, ["subjectIds", "subject_ids"]);
  if (!subjectIds.length) throw validationError({ subjectIds: "select at least one subject" });
  return { subjectIds };
}

export function parseGradePatch(input: unknown) {
  const rec = asRecord(input, "grade");
  const hasName = rec.name !== undefined;
  const hasLetter = rec.letter !== undefined;
  const hasMin = rec.minPct !== undefined || rec.min_pct !== undefined;
  const hasMax = rec.maxPct !== undefined || rec.max_pct !== undefined;
  const hasPoints = rec.points !== undefined;
  const name = hasName ? firstId(rec, ["name"]) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  const letter = hasLetter ? firstId(rec, ["letter"]) : undefined;
  if (hasLetter && !letter) throw validationError({ letter: "required" });
  const pointsRaw = rec.points;
  const patch = {
    name,
    letter,
    minPct: hasMin
      ? asNonNegNumber(rec.minPct ?? rec.min_pct, "minPct")
      : undefined,
    maxPct: hasMax
      ? asNonNegNumber(rec.maxPct ?? rec.max_pct, "maxPct")
      : undefined,
    points: hasPoints
      ? pointsRaw === null || trim(pointsRaw) === ""
        ? null
        : asNonNegNumber(pointsRaw, "points")
      : undefined,
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ grade: "required" });
  }
  return patch;
}

export function parseLeaveTypePatch(input: unknown) {
  const rec = asRecord(input, "leaveType");
  const hasName = rec.name !== undefined;
  const hasDays = rec.daysYear !== undefined || rec.days_year !== undefined;
  const name = hasName ? firstId(rec, ["name"]) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  const daysYear = hasDays
    ? asNonNegNumber(rec.daysYear ?? rec.days_year, "daysYear")
    : undefined;
  if (daysYear !== undefined && !Number.isInteger(daysYear)) {
    throw validationError({ daysYear: "invalid" });
  }
  const patch = { name, daysYear };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ leaveType: "required" });
  }
  return patch;
}

export function parsePeriodPatch(input: unknown) {
  const rec = asRecord(input, "period");
  const hasName = rec.name !== undefined;
  const hasStart = rec.startTime !== undefined || rec.start_time !== undefined;
  const hasEnd = rec.endTime !== undefined || rec.end_time !== undefined;
  const hasSort = rec.sortOrder !== undefined || rec.sort_order !== undefined;
  const name = hasName ? firstId(rec, ["name"]) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  const startTime = hasStart
    ? firstId(rec, ["startTime", "start_time"])
    : undefined;
  if (hasStart && !startTime) throw validationError({ startTime: "required" });
  const endTime = hasEnd ? firstId(rec, ["endTime", "end_time"]) : undefined;
  if (hasEnd && !endTime) throw validationError({ endTime: "required" });
  const sortOrder = hasSort
    ? asNonNegNumber(rec.sortOrder ?? rec.sort_order, "sortOrder")
    : undefined;
  if (sortOrder !== undefined && !Number.isInteger(sortOrder)) {
    throw validationError({ sortOrder: "invalid" });
  }
  const patch = { name, startTime, endTime, sortOrder };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw validationError({ period: "required" });
  }
  return patch;
}

export function parseQuestionnaireSubmission(input: unknown) {
  const rec = asRecord(input, "respondentId");
  const respondentId = firstId(rec, [
    "respondentId",
    "respondent_id",
    "student_id",
    "studentId",
  ]);
  if (!respondentId) throw validationError({ respondentId: "required" });
  const answers = rec.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw validationError({ answers: "required" });
  }
  return {
    respondentId,
    assignmentId:
      firstId(rec, ["assignmentId", "assignment_id"]) || undefined,
    answers: answers as Record<string, unknown>,
  };
}

export function flattenPayslips(
  runs: Array<{
    year: number;
    month: number;
    slips: Array<{
      id: string;
      gross: unknown;
      pf: unknown;
      esi: unknown;
      pt: unknown;
      tds: unknown;
      net: unknown;
      staff?: { employeeId?: string | null; firstName?: string | null } | null;
    }>;
  }>,
) {
  return runs.flatMap((run) =>
    run.slips.map((slip) => ({
      id: slip.id,
      employeeId: slip.staff?.employeeId ?? "",
      staffName: slip.staff?.firstName ?? "",
      year: run.year,
      month: run.month,
      gross: String(slip.gross),
      pf: String(slip.pf),
      esi: String(slip.esi),
      pt: String(slip.pt),
      tds: String(slip.tds),
      net: String(slip.net),
    })),
  );
}

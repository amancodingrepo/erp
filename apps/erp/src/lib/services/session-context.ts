import { cookieSecure } from "@/lib/auth-cookie";
import { currentSessionId, sessionInCampus } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import type { AuthPrincipal } from "@/lib/permissions";
import {
  attachSessionPrefixes,
  dropSessionPrefix,
  listSessionPrefixes,
  saveSessionPrefix,
  saveSessionPrefixes,
} from "@/lib/services/campus-session-prefixes";

export const SESSION_COOKIE = "erp_session";
export const CLASS_TEACHERS_KEY = "academics.classTeachers";

export type ClassTeacherRow = { sectionId: string; staffId: string };

export function enrollmentScope(sessionId?: string | null) {
  const id = sessionId?.trim();
  if (id) return { sessionId: id };
  return { isCurrent: true };
}

export function nextYearIdFromLive(
  sessionId: string,
  sessions: Array<{ id: string; sequenceNo: number }>,
) {
  const current = sessions.find((row) => row.id === sessionId);
  if (!current) return null;
  const later = sessions
    .filter((row) => row.sequenceNo > current.sequenceNo)
    .sort((a, b) => a.sequenceNo - b.sequenceNo);
  return later[0]?.id ?? null;
}

export function toAcademicYear<
  T extends {
    id: string;
    name: string;
    code?: string | null;
    sequenceNo: number;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    isCurrent: boolean;
    isActive: boolean;
  },
>(session: T, sessions: Array<{ id: string; sequenceNo: number }>) {
  const nextYearId = nextYearIdFromLive(session.id, sessions);
  return {
    ...session,
    is_current: session.isCurrent,
    nextYearId,
    next_year_id: nextYearId,
  };
}

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function academicYearDeleteBlocked(input: {
  isCurrent: boolean;
  isCampusCurrent: boolean;
  enrollments: number;
  feeMasters: number;
  examGroups: number;
  timetableSlots: number;
  workingDays: number;
}) {
  return (
    input.isCurrent ||
    input.isCampusCurrent ||
    input.enrollments > 0 ||
    input.feeMasters > 0 ||
    input.examGroups > 0 ||
    input.timetableSlots > 0 ||
    input.workingDays > 0
  );
}

export function parseAcademicYearPatch(value: unknown) {
  if (!value || typeof value !== "object") throw validationError({ year: "required" });
  const rec = value as Record<string, unknown>;
  const hasName = rec.name !== undefined;
  const hasCode = rec.code !== undefined;
  const hasSeq = rec.sequenceNo !== undefined || rec.sequence_no !== undefined;
  const hasStart = rec.startDate !== undefined || rec.start_date !== undefined;
  const hasEnd = rec.endDate !== undefined || rec.end_date !== undefined;
  const hasCurrent = rec.isCurrent !== undefined || rec.is_current !== undefined;
  const hasReceipt = rec.receiptPrefix !== undefined || rec.receipt_prefix !== undefined;
  const hasInvoice = rec.invoicePrefix !== undefined || rec.invoice_prefix !== undefined;
  const hasAdmission =
    rec.admissionPrefix !== undefined || rec.admission_prefix !== undefined;
  const hasFirst =
    rec.firstAdmissionNo !== undefined || rec.first_admission_no !== undefined;
  const name = hasName ? trim(rec.name) : undefined;
  if (hasName && !name) throw validationError({ name: "required" });
  let sequenceNo: number | undefined;
  if (hasSeq) {
    const n = Number(rec.sequenceNo ?? rec.sequence_no);
    if (!Number.isFinite(n)) throw validationError({ sequenceNo: "number" });
    sequenceNo = Math.floor(n);
  }
  let firstAdmissionNo: number | undefined;
  if (hasFirst) {
    const firstRaw = rec.firstAdmissionNo ?? rec.first_admission_no;
    if (firstRaw != null && firstRaw !== "") {
      const n = Number(firstRaw);
      if (!Number.isFinite(n)) throw validationError({ firstAdmissionNo: "number" });
      firstAdmissionNo = Math.floor(n);
    }
  }
  const patch = {
    name,
    code: hasCode ? trim(rec.code) : undefined,
    sequenceNo,
    startDate: hasStart ? trim(rec.startDate ?? rec.start_date) : undefined,
    endDate: hasEnd ? trim(rec.endDate ?? rec.end_date) : undefined,
    isCurrent: hasCurrent
      ? rec.isCurrent === true || rec.is_current === true
      : undefined,
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
    throw validationError({ year: "required" });
  }
  return patch;
}

export async function getAcademicYear(campusId: string, id: string) {
  const session = await prisma.academicSession.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!session) throw notFound("session");
  const sessions = await prisma.academicSession.findMany({
    where: { campusId },
    select: { id: true, sequenceNo: true },
  });
  const [attached] = attachSessionPrefixes(
    [toAcademicYear(session, sessions)],
    await listSessionPrefixes(campusId),
  );
  return attached!;
}

export async function patchAcademicYear(
  campusId: string,
  id: string,
  patch: {
    name?: string;
    code?: string;
    sequenceNo?: number;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    receiptPrefix?: string;
    invoicePrefix?: string;
    admissionPrefix?: string;
    firstAdmissionNo?: number;
  },
) {
  const existing = await prisma.academicSession.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!existing) throw notFound("session");
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  if (!name) throw validationError({ name: "required" });
  try {
    await prisma.academicSession.update({
      where: { id: existing.id },
      data: {
        name,
        ...(patch.code !== undefined ? { code: trim(patch.code) || null } : {}),
        ...(patch.sequenceNo !== undefined ? { sequenceNo: patch.sequenceNo } : {}),
        ...(patch.startDate !== undefined
          ? { startDate: patch.startDate ? new Date(patch.startDate) : null }
          : {}),
        ...(patch.endDate !== undefined
          ? { endDate: patch.endDate ? new Date(patch.endDate) : null }
          : {}),
      },
    });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "P2002") throw conflict("duplicate academic year");
    throw error;
  }
  if (
    patch.receiptPrefix !== undefined ||
    patch.invoicePrefix !== undefined ||
    patch.admissionPrefix !== undefined ||
    patch.firstAdmissionNo !== undefined
  ) {
    await saveSessionPrefix(campusId, {
      sessionId: existing.id,
      ...(patch.receiptPrefix !== undefined ? { receiptPrefix: patch.receiptPrefix } : {}),
      ...(patch.invoicePrefix !== undefined ? { invoicePrefix: patch.invoicePrefix } : {}),
      ...(patch.admissionPrefix !== undefined
        ? { admissionPrefix: patch.admissionPrefix }
        : {}),
      ...(patch.firstAdmissionNo !== undefined
        ? { firstAdmissionNo: patch.firstAdmissionNo }
        : {}),
    });
  }
  if (patch.isCurrent === true) {
    await setCurrentSession(campusId, existing.id);
  }
  return getAcademicYear(campusId, existing.id);
}

export async function removeAcademicYear(campusId: string, id: string) {
  const existing = await prisma.academicSession.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!existing) throw notFound("session");
  const campus = await prisma.campus.findUnique({
    where: { id: campusId },
    select: { currentSessionId: true },
  });
  const [enrollments, feeMasters, examGroups, timetableSlots, workingDays] =
    await Promise.all([
      prisma.studentEnrollment.count({ where: { sessionId: existing.id } }),
      prisma.feeMaster.count({ where: { sessionId: existing.id } }),
      prisma.examGroup.count({ where: { sessionId: existing.id } }),
      prisma.timetableSlot.count({ where: { sessionId: existing.id } }),
      prisma.workingDay.count({ where: { sessionId: existing.id } }),
    ]);
  if (
    academicYearDeleteBlocked({
      isCurrent: existing.isCurrent,
      isCampusCurrent: campus?.currentSessionId === existing.id,
      enrollments,
      feeMasters,
      examGroups,
      timetableSlots,
      workingDays,
    })
  ) {
    if (existing.isCurrent || campus?.currentSessionId === existing.id) {
      throw conflict("academic year is current");
    }
    throw conflict("academic year is in use");
  }
  await prisma.academicSession.delete({ where: { id: existing.id } });
  await saveSessionPrefixes(
    campusId,
    dropSessionPrefix(await listSessionPrefixes(campusId), existing.id),
  );
  return { id: existing.id, deleted: true };
}

export function parseAcademicYearCreate(value: unknown) {
  if (!value || typeof value !== "object") throw validationError({ name: "required" });
  const rec = value as Record<string, unknown>;
  const name = String(rec.name ?? "").trim();
  if (!name) throw validationError({ name: "required" });
  const codeRaw = rec.code != null ? String(rec.code).trim() : "";
  const seqRaw = rec.sequenceNo ?? rec.sequence_no;
  const sequenceNo =
    seqRaw == null || seqRaw === ""
      ? 0
      : Number(seqRaw);
  if (!Number.isFinite(sequenceNo)) throw validationError({ sequenceNo: "number" });
  const startDate = String(rec.startDate ?? rec.start_date ?? "").trim() || undefined;
  const endDate = String(rec.endDate ?? rec.end_date ?? "").trim() || undefined;
  const firstRaw = rec.firstAdmissionNo ?? rec.first_admission_no;
  const firstAdmissionNo =
    firstRaw == null || firstRaw === ""
      ? undefined
      : Number(firstRaw);
  if (firstAdmissionNo !== undefined && !Number.isFinite(firstAdmissionNo)) {
    throw validationError({ firstAdmissionNo: "number" });
  }
  return {
    name,
    code: codeRaw || undefined,
    sequenceNo: Math.floor(sequenceNo),
    startDate,
    endDate,
    isCurrent: rec.isCurrent === true || rec.is_current === true,
    receiptPrefix:
      rec.receiptPrefix != null ? String(rec.receiptPrefix) : undefined,
    invoicePrefix:
      rec.invoicePrefix != null ? String(rec.invoicePrefix) : undefined,
    admissionPrefix:
      rec.admissionPrefix != null ? String(rec.admissionPrefix) : undefined,
    firstAdmissionNo:
      firstAdmissionNo !== undefined ? Math.floor(firstAdmissionNo) : undefined,
  };
}

export async function setCurrentSession(campusId: string, sessionId: string) {
  const session = await prisma.academicSession.findFirst({
    where: { id: sessionId, campusId },
  });
  if (!session) throw notFound("session");
  await prisma.$transaction([
    prisma.academicSession.updateMany({
      where: { campusId },
      data: { isCurrent: false },
    }),
    prisma.academicSession.updateMany({
      where: { id: sessionId, campusId },
      data: { isCurrent: true, isActive: true },
    }),
    prisma.campus.update({
      where: { id: campusId },
      data: { currentSessionId: sessionId },
    }),
  ]);
  return prisma.academicSession.findFirst({
    where: { id: sessionId, campusId },
  });
}

export function sessionIdFromCookieHeader(header?: string | null) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === SESSION_COOKIE) {
      const value = rest.join("=").trim();
      if (!value) return null;
      try {
        return decodeURIComponent(value) || null;
      } catch {
        return value;
      }
    }
  }
  return null;
}

export function sessionIdFromRequest(
  request: Request,
  fallback?: string | null,
) {
  const fromQuery = new URL(request.url).searchParams.get("sessionId")?.trim();
  if (fromQuery) return fromQuery;
  const fromCookie = sessionIdFromCookieHeader(request.headers.get("cookie"));
  if (fromCookie) return fromCookie;
  return fallback?.trim() || null;
}

export async function viewingSessionId(
  request: Request,
  user: AuthPrincipal,
) {
  const campusCurrent = await currentSessionId(user);
  const raw = sessionIdFromRequest(request, campusCurrent);
  if (!raw) return campusCurrent;
  const session = await prisma.academicSession.findFirst({
    where: { id: raw, campusId: user.campusId },
  });
  return session?.id ?? campusCurrent;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    secure: cookieSecure(),
  };
}

export function parseClassTeachers(value: unknown): ClassTeacherRow[] {
  if (!Array.isArray(value)) return [];
  const out: ClassTeacherRow[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const sectionId = String(rec.sectionId ?? "").trim();
    const staffId = String(rec.staffId ?? "").trim();
    if (!sectionId || !staffId || seen.has(sectionId)) continue;
    seen.add(sectionId);
    out.push({ sectionId, staffId });
  }
  return out;
}

export function classTeacherForSection(
  rows: ClassTeacherRow[],
  sectionId: string,
) {
  return rows.find((row) => row.sectionId === sectionId)?.staffId ?? null;
}

export function getClassTeacherRow(rows: ClassTeacherRow[], sectionId: string) {
  const key = String(sectionId ?? "").trim();
  if (!key) throw validationError({ sectionId: "required" });
  const row = rows.find((entry) => entry.sectionId === key);
  if (!row) throw notFound("class teacher");
  return row;
}

export function upsertClassTeacher(
  rows: ClassTeacherRow[],
  sectionId: string,
  staffId: string | null,
) {
  const id = sectionId.trim();
  if (!id) throw validationError({ sectionId: "required" });
  const without = rows.filter((row) => row.sectionId !== id);
  const next = staffId?.trim();
  if (!next) return without;
  return [...without, { sectionId: id, staffId: next }];
}

export async function listClassTeachers(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: CLASS_TEACHERS_KEY } },
  });
  return parseClassTeachers(row?.value);
}

export async function saveClassTeachers(
  campusId: string,
  rows: ClassTeacherRow[],
) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: CLASS_TEACHERS_KEY } },
    update: { value: rows },
    create: { campusId, key: CLASS_TEACHERS_KEY, value: rows },
  });
  return rows;
}

export async function writeClassTeacher(
  campusId: string,
  sectionId: string,
  staffId: string | null,
) {
  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      class: { program: { department: { campusId } } },
    },
  });
  if (!section) throw notFound("section");
  if (staffId) {
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, campusId },
    });
    if (!staff) throw notFound("staff");
  }
  const next = upsertClassTeacher(
    await listClassTeachers(campusId),
    sectionId,
    staffId,
  );
  await saveClassTeachers(campusId, next);
  return next;
}

export async function getClassTeacher(campusId: string, sectionId: string) {
  const desk = await listClassTeacherDesk(campusId);
  const row = desk.data.find((item) => item.sectionId === String(sectionId ?? "").trim());
  if (!row) throw notFound("section");
  if (!row.staffId) throw notFound("class teacher");
  return row;
}

export async function patchClassTeacher(
  campusId: string,
  sectionId: string,
  patch: { staffId: string | null },
) {
  await writeClassTeacher(campusId, sectionId, patch.staffId);
  const desk = await listClassTeacherDesk(campusId);
  const row = desk.data.find((item) => item.sectionId === String(sectionId ?? "").trim());
  if (!row) throw notFound("section");
  return row;
}

export async function removeClassTeacher(campusId: string, sectionId: string) {
  const existing = await getClassTeacher(campusId, sectionId);
  await writeClassTeacher(campusId, existing.sectionId, null);
  return { id: existing.sectionId, deleted: true };
}

export function staffDisplayName(staff: {
  firstName: string;
  lastName?: string | null;
}) {
  return [staff.firstName, staff.lastName].filter(Boolean).join(" ");
}

export type AttachedClassTeacher = { staffId: string; name: string } | null;

export function attachClassTeachers<
  T extends { sections: Array<{ id: string }> },
>(
  classes: T[],
  rows: ClassTeacherRow[],
  staff: Array<{ id: string; firstName: string; lastName?: string | null }>,
): Array<
  Omit<T, "sections"> & {
    sections: Array<T["sections"][number] & { classTeacher: AttachedClassTeacher }>;
  }
> {
  const teacherBySection = new Map(rows.map((row) => [row.sectionId, row.staffId]));
  const staffById = new Map(staff.map((row) => [row.id, row]));
  return classes.map((klass) => ({
    ...klass,
    sections: klass.sections.map((section) => {
      const staffId = teacherBySection.get(section.id) ?? null;
      const person = staffId ? staffById.get(staffId) : undefined;
      return {
        ...section,
        classTeacher: staffId
          ? {
              staffId,
              name: person ? staffDisplayName(person) : staffId,
            }
          : null,
      };
    }),
  }));
}

export async function listClassTeacherDesk(campusId: string) {
  const [rows, classes, staff] = await Promise.all([
    listClassTeachers(campusId),
    prisma.class.findMany({
      where: { program: { department: { campusId } } },
      include: { sections: true, program: true },
      orderBy: { sequenceNo: "asc" },
    }),
    prisma.staff.findMany({
      where: { campusId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
      },
      orderBy: { firstName: "asc" },
    }),
  ]);
  const attached = attachClassTeachers(classes, rows, staff);
  return {
    data: attached.flatMap((klass) =>
      klass.sections.map((section) => ({
        classId: klass.id,
        className: klass.name,
        sectionId: section.id,
        sectionName: section.name,
        staffId: section.classTeacher?.staffId ?? null,
        staffName: section.classTeacher?.name ?? null,
      })),
    ),
    staff,
    classes: attached,
  };
}

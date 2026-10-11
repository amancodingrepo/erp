import { StudentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { validationError } from "@/lib/errors";
import { sectionInCampus, sessionInCampus } from "@/lib/campus";
import { nextYearIdFromLive } from "@/lib/services/session-context";

export const PROMOTE_PROCEDURES = ["promote", "change", "alumni"] as const;
export type PromoteProcedure = (typeof PROMOTE_PROCEDURES)[number];

export function parsePromoteProcedure(raw?: string | null): PromoteProcedure {
  if (!raw || raw === "promote") return "promote";
  if (raw === "change" || raw === "alumni") return raw;
  throw validationError({ procedure: "invalid" });
}

export function promoteNeedsTarget(procedure: PromoteProcedure) {
  return procedure !== "alumni";
}

export const YEAR_END_KINDS = ["change-class", "promote", "alumni"] as const;
export type YearEndKind = (typeof YEAR_END_KINDS)[number];

function trimId(value: unknown) {
  return String(value ?? "").trim();
}

function firstId(rec: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const id = trimId(rec[key]);
    if (id) return id;
  }
  return undefined;
}

function idList(rec: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = rec[key];
    if (Array.isArray(value)) {
      return value.map((row) => trimId(row)).filter(Boolean);
    }
  }
  return [];
}

export function parseYearEndKind(raw: string): YearEndKind {
  if (raw === "change-class" || raw === "promote" || raw === "alumni") return raw;
  throw validationError({ procedure: "invalid" });
}

export function parseYearEnd(kind: string, value: unknown) {
  const action = parseYearEndKind(kind);
  if (!value || typeof value !== "object") {
    throw validationError({ studentIds: "required" });
  }
  const rec = value as Record<string, unknown>;
  const studentIds = idList(rec, ["studentIds", "student_ids"]);
  if (!studentIds.length) throw validationError({ studentIds: "required" });
  const procedure: PromoteProcedure =
    action === "change-class" ? "change" : action;
  return {
    procedure,
    studentIds,
    fromSectionId: firstId(rec, [
      "fromSectionId",
      "from_section_id",
      "fromClassId",
      "from_class_id",
    ]),
    toSectionId: firstId(rec, [
      "toSectionId",
      "to_section_id",
      "toClassId",
      "to_class_id",
    ]),
    toSessionId: firstId(rec, [
      "toSessionId",
      "to_session_id",
      "academic_year_id",
      "academicYearId",
    ]),
    exitDate: firstId(rec, ["exitDate", "exit_date"]),
  };
}

export function fromSectionFromEnrollments(
  studentIds: string[],
  enrollments: Array<{ studentId: string; sectionId: string }>,
) {
  const wanted = new Set(studentIds);
  const sections = new Set(
    enrollments
      .filter((row) => wanted.has(row.studentId))
      .map((row) => row.sectionId),
  );
  if (sections.size !== 1) {
    throw validationError({ fromSectionId: "students must share one class" });
  }
  return [...sections][0]!;
}

export function toSessionForYearEnd(
  procedure: PromoteProcedure,
  fromSessionId: string | null | undefined,
  sessions: Array<{ id: string; sequenceNo: number }>,
  explicit?: string,
) {
  if (explicit) return explicit;
  if (procedure === "alumni") return undefined;
  if (procedure === "change") return fromSessionId || undefined;
  if (!fromSessionId) return undefined;
  return nextYearIdFromLive(fromSessionId, sessions) ?? undefined;
}

export async function yearEndPromote(
  campusId: string,
  kind: string,
  value: unknown,
) {
  const parsed = parseYearEnd(kind, value);
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      isCurrent: true,
      studentId: { in: parsed.studentIds },
      student: { campusId },
    },
    select: { studentId: true, sectionId: true, sessionId: true },
  });
  const fromSectionId =
    parsed.fromSectionId ??
    fromSectionFromEnrollments(parsed.studentIds, enrollments);
  const fromSessionId =
    enrollments.find((row) => row.sectionId === fromSectionId)?.sessionId ??
    enrollments[0]?.sessionId ??
    null;
  let toSessionId = parsed.toSessionId;
  if (promoteNeedsTarget(parsed.procedure) && !toSessionId) {
    const sessions = await prisma.academicSession.findMany({
      where: { campusId },
      select: { id: true, sequenceNo: true },
    });
    toSessionId = toSessionForYearEnd(
      parsed.procedure,
      fromSessionId,
      sessions,
    );
  }
  return promote({
    campusId,
    fromSectionId,
    toSectionId: parsed.toSectionId,
    toSessionId,
    studentIds: parsed.studentIds,
    procedure: parsed.procedure,
  });
}

export type PromoteInput = {
  campusId: string;
  fromSectionId: string;
  toSectionId?: string;
  toSessionId?: string;
  studentIds: string[];
  procedure?: PromoteProcedure | string;
};

export type PromoteResult = {
  promoted: number;
  enrollmentIds: string[];
  procedure: PromoteProcedure;
};

export async function promote(input: PromoteInput): Promise<PromoteResult> {
  if (!input.studentIds?.length) {
    throw validationError({ studentIds: "required" });
  }
  const procedure = parsePromoteProcedure(input.procedure);
  const fromSection = await sectionInCampus(input.campusId, input.fromSectionId);

  if (procedure === "alumni") {
    return prisma.$transaction(async (tx) => {
      const current = await tx.studentEnrollment.findMany({
        where: {
          sectionId: fromSection.id,
          isCurrent: true,
          studentId: { in: input.studentIds },
          student: { campusId: input.campusId },
        },
      });
      const ids = current.map((row) => row.studentId);
      if (ids.length) {
        await tx.studentEnrollment.updateMany({
          where: { studentId: { in: ids }, isCurrent: true },
          data: { isCurrent: false },
        });
        await tx.student.updateMany({
          where: { id: { in: ids }, campusId: input.campusId },
          data: { status: StudentStatus.ALUMNI },
        });
      }
      return { promoted: ids.length, enrollmentIds: [], procedure };
    });
  }

  if (!input.toSectionId) throw validationError({ toSectionId: "required" });
  if (!input.toSessionId) throw validationError({ toSessionId: "required" });
  const toSessionId = input.toSessionId;
  const toSection = await sectionInCampus(input.campusId, input.toSectionId);
  await sessionInCampus(input.campusId, toSessionId);

  return prisma.$transaction(async (tx) => {
    const current = await tx.studentEnrollment.findMany({
      where: {
        sectionId: fromSection.id,
        isCurrent: true,
        studentId: { in: input.studentIds },
        student: { campusId: input.campusId },
      },
    });

    const enrollmentIds: string[] = [];
    for (const row of current) {
      const inTarget = await tx.studentEnrollment.findFirst({
        where: {
          studentId: row.studentId,
          sessionId: toSessionId,
          sectionId: toSection.id,
        },
      });
      if (inTarget?.isCurrent) continue;

      await tx.studentEnrollment.updateMany({
        where: { studentId: row.studentId, isCurrent: true },
        data: { isCurrent: false },
      });

      const existing =
        inTarget ??
        (await tx.studentEnrollment.findFirst({
          where: {
            studentId: row.studentId,
            sessionId: toSessionId,
          },
        }));
      if (existing) {
        const updated = await tx.studentEnrollment.update({
          where: { id: existing.id },
          data: {
            classId: toSection.classId,
            sectionId: toSection.id,
            isCurrent: true,
          },
        });
        enrollmentIds.push(updated.id);
        continue;
      }

      const created = await tx.studentEnrollment.create({
        data: {
          studentId: row.studentId,
          sessionId: toSessionId,
          classId: toSection.classId,
          sectionId: toSection.id,
          rollNo: row.rollNo,
          isCurrent: true,
        },
      });
      enrollmentIds.push(created.id);
    }

    return { promoted: enrollmentIds.length, enrollmentIds, procedure };
  });
}

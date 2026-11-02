import { StudentStatus } from "@prisma/client";
import { classInCampus } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import {
  listClassTeachers,
  saveClassTeachers,
  staffDisplayName,
  type ClassTeacherRow,
} from "@/lib/services/session-context";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export type ClassOffering = {
  subjectId: string;
  sectionId: string | null;
  staffId: string | null;
};

export function replaceClassTeachers(
  rows: ClassTeacherRow[],
  sectionIds: string[],
  assignments: unknown,
) {
  const live = new Set(sectionIds.map((id) => trim(id)).filter(Boolean));
  if (!Array.isArray(assignments)) throw validationError({ teachers: "required" });
  const nextAssigned: ClassTeacherRow[] = [];
  const seen = new Set<string>();
  for (const row of assignments) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const sectionId = trim(rec.sectionId);
    if (!sectionId) continue;
    if (!live.has(sectionId)) throw validationError({ sectionId: "unknown" });
    if (seen.has(sectionId)) throw validationError({ sectionId: "duplicate" });
    seen.add(sectionId);
    const staffId = trim(rec.staffId);
    if (staffId) nextAssigned.push({ sectionId, staffId });
  }
  return [...rows.filter((row) => !live.has(row.sectionId)), ...nextAssigned];
}

export function parseClassOfferings(
  input: unknown,
  liveSubjectIds: string[],
  liveSectionIds: string[],
): ClassOffering[] {
  if (!Array.isArray(input)) throw validationError({ subjects: "required" });
  const liveSubjects = new Set(liveSubjectIds.map((id) => trim(id)).filter(Boolean));
  const liveSections = new Set(liveSectionIds.map((id) => trim(id)).filter(Boolean));
  const out: ClassOffering[] = [];
  const seen = new Set<string>();
  for (const row of input) {
    let subjectId = "";
    let sectionId: string | null = null;
    let staffId: string | null = null;
    if (typeof row === "string") {
      subjectId = trim(row);
    } else if (row && typeof row === "object") {
      const rec = row as Record<string, unknown>;
      subjectId = trim(rec.subjectId);
      sectionId =
        rec.sectionId == null || rec.sectionId === "" ? null : trim(rec.sectionId);
      staffId = rec.staffId == null || rec.staffId === "" ? null : trim(rec.staffId);
    }
    if (!subjectId) continue;
    if (!liveSubjects.has(subjectId)) throw validationError({ subjectId: "unknown" });
    if (sectionId && !liveSections.has(sectionId)) {
      throw validationError({ sectionId: "unknown" });
    }
    const key = `${subjectId}:${sectionId ?? ""}`;
    if (seen.has(key)) {
      const idx = out.findIndex(
        (item) => item.subjectId === subjectId && item.sectionId === sectionId,
      );
      if (idx >= 0) out.splice(idx, 1);
    }
    seen.add(key);
    out.push({ subjectId, sectionId, staffId });
  }
  return out;
}

async function classWithSections(campusId: string, classId: string) {
  const klass = await prisma.class.findFirst({
    where: { id: classId, program: { department: { campusId } } },
    include: { sections: { select: { id: true, name: true } } },
  });
  if (!klass) throw notFound("class");
  return klass;
}

export async function listClassDeskTeachers(campusId: string, classId: string) {
  const klass = await classWithSections(campusId, classId);
  const sectionIds = klass.sections.map((row) => row.id);
  const live = new Set(sectionIds);
  const [rows, staff] = await Promise.all([
    listClassTeachers(campusId),
    prisma.staff.findMany({
      where: { campusId },
      select: { id: true, firstName: true, lastName: true, employeeId: true },
    }),
  ]);
  const byId = new Map(staff.map((row) => [row.id, row]));
  const teachers = rows
    .filter((row) => live.has(row.sectionId))
    .map((row) => {
      const person = byId.get(row.staffId);
      const section = klass.sections.find((item) => item.id === row.sectionId);
      return {
        sectionId: row.sectionId,
        sectionName: section?.name ?? row.sectionId,
        staffId: row.staffId,
        staffName: person ? staffDisplayName(person) : row.staffId,
      };
    });
  return {
    classId: klass.id,
    sections: klass.sections,
    teachers,
    staff,
  };
}

export async function saveClassDeskTeachers(
  campusId: string,
  classId: string,
  assignments: unknown,
) {
  const klass = await classWithSections(campusId, classId);
  const next = replaceClassTeachers(
    await listClassTeachers(campusId),
    klass.sections.map((row) => row.id),
    assignments,
  );
  const staffIds = [...new Set(next.map((row) => row.staffId))];
  if (staffIds.length) {
    const live = await prisma.staff.findMany({
      where: { campusId, id: { in: staffIds } },
      select: { id: true },
    });
    if (live.length !== staffIds.length) throw notFound("staff");
  }
  await saveClassTeachers(campusId, next);
  return listClassDeskTeachers(campusId, klass.id);
}

export async function listClassDeskSubjects(
  campusId: string,
  classId: string,
  sessionId: string | null,
) {
  await classInCampus(campusId, classId);
  const data = await prisma.classSubject.findMany({
    where: {
      classId,
      ...(sessionId ? { sessionId } : {}),
    },
    include: { subject: { select: { id: true, name: true, code: true } } },
    orderBy: { id: "asc" },
  });
  return { classId, sessionId, data };
}

export async function saveClassDeskSubjects(
  campusId: string,
  classId: string,
  input: unknown,
  sessionId: string | null,
) {
  const klass = await classWithSections(campusId, classId);
  const subjects = await prisma.subject.findMany({
    where: { campusId },
    select: { id: true },
  });
  const offerings = parseClassOfferings(
    input,
    subjects.map((row) => row.id),
    klass.sections.map((row) => row.id),
  );
  const staffIds = [
    ...new Set(offerings.map((row) => row.staffId).filter((id): id is string => Boolean(id))),
  ];
  if (staffIds.length) {
    const live = await prisma.staff.findMany({
      where: { campusId, id: { in: staffIds } },
      select: { id: true },
    });
    if (live.length !== staffIds.length) throw notFound("staff");
  }
  await prisma.$transaction([
    prisma.classSubject.deleteMany({
      where: { classId: klass.id, sessionId: sessionId ?? null },
    }),
    ...offerings.map((row) =>
      prisma.classSubject.create({
        data: {
          classId: klass.id,
          subjectId: row.subjectId,
          sectionId: row.sectionId,
          staffId: row.staffId,
          sessionId: sessionId ?? null,
        },
      }),
    ),
  ]);
  return listClassDeskSubjects(campusId, klass.id, sessionId);
}

export async function listClassDeskStudents(
  campusId: string,
  classId: string,
  sessionId: string | null,
) {
  await classInCampus(campusId, classId);
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classId,
      ...(sessionId ? { sessionId } : { isCurrent: true }),
      student: { campusId, status: StudentStatus.ACTIVE },
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNo: true,
          enrollmentNo: true,
        },
      },
      section: { select: { id: true, name: true } },
    },
    orderBy: [{ section: { name: "asc" } }, { rollNo: "asc" }],
  });
  return {
    classId,
    sessionId,
    data: enrollments.map((row) => ({
      id: row.student.id,
      admissionNo: row.student.admissionNo,
      enrollmentNo: row.student.enrollmentNo,
      name: [row.student.firstName, row.student.lastName].filter(Boolean).join(" "),
      sectionId: row.section.id,
      section: row.section.name,
      rollNo: row.rollNo,
    })),
  };
}

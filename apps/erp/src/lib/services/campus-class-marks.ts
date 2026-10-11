import { StudentStatus } from "@prisma/client";
import { classInCampus } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import type { AuthPrincipal } from "@/lib/permissions";
import { saveMarks } from "@/lib/services/exams";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export type ClassMarkEntry = {
  studentId: string;
  marks?: number | string | null;
  isAbsent?: boolean;
};

export function groupClassMarkEntries(input: unknown) {
  if (!Array.isArray(input)) throw validationError({ entries: "required" });
  const order: string[] = [];
  const byPaper = new Map<string, Map<string, ClassMarkEntry>>();
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const examSubjectId = trim(rec.examSubjectId);
    const studentId = trim(rec.studentId);
    if (!examSubjectId) throw validationError({ examSubjectId: "required" });
    if (!studentId) throw validationError({ studentId: "required" });
    if (!byPaper.has(examSubjectId)) {
      byPaper.set(examSubjectId, new Map());
      order.push(examSubjectId);
    }
    byPaper.get(examSubjectId)!.set(studentId, {
      studentId,
      marks: rec.marks as number | string | null | undefined,
      isAbsent: rec.isAbsent === true,
    });
  }
  return order.map((examSubjectId) => ({
    examSubjectId,
    entries: [...byPaper.get(examSubjectId)!.values()],
  }));
}

export async function listClassMarks(
  campusId: string,
  classId: string,
  sessionId: string | null,
  examId?: string | null,
) {
  const klass = await prisma.class.findFirst({
    where: { id: classId, program: { department: { campusId } } },
    include: { sections: { select: { id: true, name: true } } },
  });
  if (!klass) throw notFound("class");
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classId: klass.id,
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
        },
      },
      section: { select: { id: true, name: true } },
    },
    orderBy: [{ section: { name: "asc" } }, { rollNo: "asc" }],
  });
  const papers = await prisma.examSubject.findMany({
    where: {
      exam: {
        ...(examId ? { id: examId } : {}),
        group: {
          campusId,
          ...(sessionId ? { sessionId } : {}),
        },
      },
    },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          group: { select: { name: true } },
        },
      },
    },
    orderBy: { id: "asc" },
  });
  const offerings = await prisma.classSubject.findMany({
    where: { classId: klass.id, ...(sessionId ? { sessionId } : {}) },
    select: { subjectId: true },
  });
  const offered = new Set(offerings.map((row) => row.subjectId));
  const scoped = offered.size
    ? papers.filter((row) => offered.has(row.subjectId))
    : papers;
  const subjectIds = [...new Set(scoped.map((row) => row.subjectId))];
  const subjects = subjectIds.length
    ? await prisma.subject.findMany({
        where: { campusId, id: { in: subjectIds } },
        select: { id: true, name: true, code: true },
      })
    : [];
  const subjectName = new Map(subjects.map((row) => [row.id, row.name]));
  const studentIds = enrollments.map((row) => row.student.id);
  const paperIds = scoped.map((row) => row.id);
  const marks =
    studentIds.length && paperIds.length
      ? await prisma.examMark.findMany({
          where: {
            studentId: { in: studentIds },
            examSubjectId: { in: paperIds },
          },
        })
      : [];
  const byKey = new Map(
    marks.map((row) => [`${row.examSubjectId}:${row.studentId}`, row]),
  );
  return {
    classId: klass.id,
    sessionId,
    examId: examId ?? null,
    papers: scoped.map((row) => ({
      examSubjectId: row.id,
      examId: row.exam.id,
      exam: row.exam.name,
      group: row.exam.group.name,
      subjectId: row.subjectId,
      subject: subjectName.get(row.subjectId) ?? row.subjectId,
      maxMarks: row.maxMarks,
      minMarks: row.minMarks,
    })),
    students: enrollments.map((row) => ({
      id: row.student.id,
      admissionNo: row.student.admissionNo,
      name: [row.student.firstName, row.student.lastName]
        .filter(Boolean)
        .join(" "),
      sectionId: row.section.id,
      section: row.section.name,
      rollNo: row.rollNo,
      marks: scoped.map((paper) => {
        const mark = byKey.get(`${paper.id}:${row.student.id}`);
        return {
          examSubjectId: paper.id,
          marks: mark?.marks ?? null,
          isAbsent: mark?.isAbsent ?? false,
          isBlocked: mark?.isBlocked ?? false,
        };
      }),
    })),
  };
}

export async function saveClassMarks(input: {
  user: AuthPrincipal;
  classId: string;
  sessionId: string | null;
  examId?: string | null;
  entries: unknown;
  request?: Request;
}) {
  await classInCampus(input.user.campusId, input.classId);
  const groups = groupClassMarkEntries(input.entries);
  const enrolled = await prisma.studentEnrollment.findMany({
    where: {
      classId: input.classId,
      ...(input.sessionId ? { sessionId: input.sessionId } : { isCurrent: true }),
      student: { campusId: input.user.campusId },
    },
    select: { studentId: true },
  });
  const liveStudents = new Set(enrolled.map((row) => row.studentId));
  let count = 0;
  for (const group of groups) {
    const paper = await prisma.examSubject.findFirst({
      where: {
        id: group.examSubjectId,
        exam: {
          group: {
            campusId: input.user.campusId,
            ...(input.sessionId ? { sessionId: input.sessionId } : {}),
          },
        },
      },
      select: { id: true },
    });
    if (!paper) throw notFound("exam subject");
    for (const entry of group.entries) {
      if (!liveStudents.has(entry.studentId)) {
        throw validationError({ studentId: "not in class" });
      }
    }
    const saved = await saveMarks({
      user: input.user,
      examSubjectId: paper.id,
      entries: group.entries,
      request: input.request,
    });
    count += saved.count;
  }
  const desk = await listClassMarks(
    input.user.campusId,
    input.classId,
    input.sessionId,
    input.examId,
  );
  return { ok: true, count, ...desk };
}

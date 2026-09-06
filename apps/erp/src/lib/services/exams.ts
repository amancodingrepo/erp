import { Prisma } from "@prisma/client";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { forbidden, notFound, validationError } from "@/lib/errors";
import { dec } from "@/lib/money";
import type { AuthPrincipal } from "@/lib/permissions";
import { buildAdmitCardPdf } from "@/lib/pdf/admit-card";
import { buildMarksheetPdf } from "@/lib/pdf/marksheet";

export async function loadExamSubject(campusId: string, examSubjectId: string) {
  const row = await prisma.examSubject.findFirst({
    where: { id: examSubjectId, exam: { group: { campusId } } },
    include: {
      marks: true,
      exam: { include: { group: true } },
    },
  });
  if (!row) throw notFound("exam subject");
  return row;
}

function canEditFinalized(user: AuthPrincipal) {
  return user.roles.includes("SuperAdmin") || user.roles.includes("Principal");
}

export async function examRoster(input: {
  campusId: string;
  examSubjectId: string;
  classId?: string;
  sectionId?: string;
}) {
  const examSubject = await loadExamSubject(input.campusId, input.examSubjectId);
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      isCurrent: true,
      sessionId: examSubject.exam.group.sessionId,
      ...(input.classId ? { classId: input.classId } : {}),
      ...(input.sectionId ? { sectionId: input.sectionId } : {}),
      student: { campusId: input.campusId, status: "ACTIVE" },
    },
    include: {
      student: true,
      class: true,
      section: true,
    },
    orderBy: [{ rollNo: "asc" }, { student: { firstName: "asc" } }],
  });
  const byStudent = new Map(examSubject.marks.map((m) => [m.studentId, m]));
  return {
    examSubjectId: examSubject.id,
    exam: examSubject.exam.name,
    group: examSubject.exam.group.name,
    maxMarks: examSubject.maxMarks,
    minMarks: examSubject.minMarks,
    finalized: examSubject.marks.some((m) => m.finalizedAt),
    data: enrollments.map((e) => {
      const mark = byStudent.get(e.studentId);
      return {
        rosterId: e.id,
        studentId: e.studentId,
        admissionNo: e.student.admissionNo,
        rollNo: e.rollNo ?? e.student.rollNo,
        name: [e.student.firstName, e.student.lastName].filter(Boolean).join(" "),
        class: e.class.name,
        section: e.section.name,
        marks: mark?.marks ?? null,
        isAbsent: mark?.isAbsent ?? false,
        isBlocked: mark?.isBlocked ?? false,
      };
    }),
  };
}

export async function saveMarks(input: {
  user: AuthPrincipal;
  examSubjectId: string;
  entries: Array<{
    studentId?: string;
    rosterId?: string;
    marks?: number | string | null;
    isAbsent?: boolean;
  }>;
  request?: Request;
}) {
  const examSubject = await loadExamSubject(input.user.campusId, input.examSubjectId);
  const finalized = examSubject.marks.some((m) => m.finalizedAt);
  if (finalized && !canEditFinalized(input.user)) {
    throw forbidden("subject is finalized");
  }
  const max = dec(examSubject.maxMarks);
  const resolved: Array<{ studentId: string; marks: Prisma.Decimal | null; isAbsent: boolean }> =
    [];
  for (const entry of input.entries) {
    let studentId = entry.studentId;
    if (!studentId && entry.rosterId) {
      const enrollment = await prisma.studentEnrollment.findFirst({
        where: {
          id: entry.rosterId,
          student: { campusId: input.user.campusId },
        },
      });
      studentId = enrollment?.studentId;
    }
    if (!studentId) throw validationError({ studentId: "required" });
    const isAbsent = Boolean(entry.isAbsent);
    if (isAbsent) {
      resolved.push({ studentId, marks: null, isAbsent: true });
      continue;
    }
    if (entry.marks === null || entry.marks === undefined || entry.marks === "") {
      throw validationError({ marks: "required unless absent" });
    }
    const marks = dec(entry.marks);
    if (marks.gt(max)) {
      throw validationError({
        marks: `Marks should not be greater than Max Marks(${max.toFixed(2)})`,
      });
    }
    if (marks.lt(0)) throw validationError({ marks: "must be >= 0" });
    resolved.push({ studentId, marks, isAbsent: false });
  }

  await prisma.$transaction(
    resolved.map((entry) =>
      prisma.examMark.upsert({
        where: {
          examSubjectId_studentId: {
            examSubjectId: input.examSubjectId,
            studentId: entry.studentId,
          },
        },
        update: {
          marks: entry.marks,
          isAbsent: entry.isAbsent,
        },
        create: {
          examSubjectId: input.examSubjectId,
          studentId: entry.studentId,
          marks: entry.marks,
          isAbsent: entry.isAbsent,
        },
      }),
    ),
  );
  await writeAudit({
    userId: input.user.id,
    campusId: input.user.campusId,
    action: "exams.marks.draft",
    entity: "ExamSubject",
    entityId: input.examSubjectId,
    after: { count: resolved.length },
    ip: input.request ? requestIp(input.request) : "local",
  });
  return { ok: true, count: resolved.length };
}

export async function finalizeSubject(input: {
  user: AuthPrincipal;
  examSubjectId: string;
  request?: Request;
}) {
  await loadExamSubject(input.user.campusId, input.examSubjectId);
  await prisma.examMark.updateMany({
    where: { examSubjectId: input.examSubjectId },
    data: { finalizedAt: new Date() },
  });
  await writeAudit({
    userId: input.user.id,
    campusId: input.user.campusId,
    action: "exams.finalize",
    entity: "ExamSubject",
    entityId: input.examSubjectId,
    after: { finalized: true },
    ip: input.request ? requestIp(input.request) : "local",
  });
  return { ok: true };
}

export async function setResultBlock(input: {
  campusId: string;
  studentId: string;
  examGroupId: string;
  blocked: boolean;
  reason?: string;
  userId: string;
}) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId: input.campusId },
  });
  if (!student) throw notFound("student");
  const group = await prisma.examGroup.findFirst({
    where: { id: input.examGroupId, campusId: input.campusId },
    include: { exams: { include: { subjects: true } } },
  });
  if (!group) throw notFound("exam group");
  const subjectIds = group.exams.flatMap((e) => e.subjects.map((s) => s.id));
  await prisma.$transaction(async (tx) => {
    for (const examSubjectId of subjectIds) {
      await tx.examMark.upsert({
        where: {
          examSubjectId_studentId: {
            examSubjectId,
            studentId: input.studentId,
          },
        },
        update: { isBlocked: input.blocked },
        create: {
          examSubjectId,
          studentId: input.studentId,
          isBlocked: input.blocked,
        },
      });
    }
  });
  await writeAudit({
    userId: input.userId,
    campusId: input.campusId,
    action: input.blocked ? "exams.result.block" : "exams.result.unblock",
    entity: "Student",
    entityId: input.studentId,
    after: { examGroupId: input.examGroupId, blocked: input.blocked, reason: input.reason ?? null },
  });
  return { ok: true, blocked: input.blocked, count: subjectIds.length };
}

export async function studentMarksheet(input: {
  campusId: string;
  studentId: string;
  examId?: string;
  examGroupId?: string;
}) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId: input.campusId },
    include: {
      campus: true,
      enrollments: { where: { isCurrent: true }, take: 1 },
    },
  });
  if (!student) throw notFound("student");
  const marks = await prisma.examMark.findMany({
    where: {
      studentId: input.studentId,
      ...(input.examId ? { examSubject: { examId: input.examId } } : {}),
      ...(input.examGroupId
        ? { examSubject: { exam: { examGroupId: input.examGroupId } } }
        : {}),
    },
    include: { examSubject: { include: { exam: { include: { group: true } } } } },
  });
  if (marks.some((m) => m.isBlocked)) {
    const view = {
      campusName: student.campus.name,
      studentName: [student.firstName, student.lastName].filter(Boolean).join(" "),
      admissionNo: student.admissionNo,
      rollNo: student.enrollments[0]?.rollNo ?? student.rollNo,
      examName: marks[0]?.examSubject.exam.name ?? "Exam",
      withheld: true,
      subjects: [] as Array<{ name: string; marks: string; maxMarks: string; absent: boolean }>,
    };
    return {
      json: { studentId: student.id, status: "withheld" as const, marks: [] },
      pdf: buildMarksheetPdf(view),
    };
  }
  const payload = {
    studentId: student.id,
    status: "ok" as const,
    marks: marks.map((m) => ({
      exam: m.examSubject.exam.name,
      group: m.examSubject.exam.group.name,
      subjectId: m.examSubject.subjectId,
      marks: m.marks,
      isAbsent: m.isAbsent,
      maxMarks: m.examSubject.maxMarks,
    })),
  };
  const view = {
    campusName: student.campus.name,
    studentName: [student.firstName, student.lastName].filter(Boolean).join(" "),
    admissionNo: student.admissionNo,
    rollNo: student.enrollments[0]?.rollNo ?? student.rollNo,
    examName: marks[0]?.examSubject.exam.name ?? "Exam",
    withheld: false,
    subjects: marks.map((m) => ({
      name: m.examSubject.exam.name,
      marks: m.marks == null ? "-" : dec(m.marks).toFixed(2),
      maxMarks: dec(m.examSubject.maxMarks).toFixed(2),
      absent: m.isAbsent,
    })),
  };
  return { json: payload, pdf: buildMarksheetPdf(view) };
}

export async function studentAdmitCard(input: {
  campusId: string;
  studentId: string;
  examId: string;
}) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId: input.campusId },
    include: {
      campus: true,
      enrollments: { where: { isCurrent: true }, take: 1 },
    },
  });
  if (!student) throw notFound("student");
  const exam = await prisma.exam.findFirst({
    where: { id: input.examId, group: { campusId: input.campusId } },
    include: { subjects: true, group: true },
  });
  if (!exam) throw notFound("exam");
  const view = {
    campusName: student.campus.name,
    studentName: [student.firstName, student.lastName].filter(Boolean).join(" "),
    admissionNo: student.admissionNo,
    rollNo: student.enrollments[0]?.rollNo ?? student.rollNo,
    examName: `${exam.group.name} / ${exam.name}`,
    papers: exam.subjects.map((s) => ({
      name: s.subjectId,
      date: s.dateFrom ? s.dateFrom.toISOString().slice(0, 10) : null,
      startTime: s.startTime,
      roomNo: s.roomNo,
    })),
  };
  return { json: view, pdf: buildAdmitCardPdf(view) };
}

import { CopoLessonStatus, ProgramOutcomeKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { dec } from "@/lib/money";
import {
  averagePercents,
  directAttainmentPercent,
  isMappingWeight,
  overallPo,
  weightedPoDirect,
} from "@/lib/copo-attainment";

async function programInCampus(campusId: string, programId: string) {
  const program = await prisma.program.findFirst({
    where: { id: programId, department: { campusId } },
  });
  if (!program) throw notFound("program");
  return program;
}

async function subjectInCampus(campusId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, campusId },
  });
  if (!subject) throw notFound("subject");
  return subject;
}

export async function createProgramOutcome(
  campusId: string,
  input: { programId: string; code: string; title: string; kind?: ProgramOutcomeKind },
) {
  await programInCampus(campusId, input.programId);
  const code = input.code.trim().toUpperCase();
  const title = input.title.trim();
  if (!code || !title) throw validationError({ code: "required" });
  const existing = await prisma.programOutcome.findUnique({
    where: { programId_code: { programId: input.programId, code } },
  });
  if (existing) throw conflict("code already exists");
  return prisma.programOutcome.create({
    data: {
      campusId,
      programId: input.programId,
      code,
      title,
      kind: input.kind ?? ProgramOutcomeKind.PO,
    },
  });
}

export async function listProgramOutcomes(campusId: string, programId?: string) {
  return prisma.programOutcome.findMany({
    where: { campusId, ...(programId ? { programId } : {}) },
    include: { program: { select: { id: true, name: true } }, indirect: true },
    orderBy: [{ code: "asc" }],
  });
}

export async function createCourseOutcome(
  campusId: string,
  input: { subjectId: string; code: string; title: string },
) {
  await subjectInCampus(campusId, input.subjectId);
  const code = input.code.trim().toUpperCase();
  const title = input.title.trim();
  if (!code || !title) throw validationError({ code: "required" });
  const existing = await prisma.courseOutcome.findUnique({
    where: { subjectId_code: { subjectId: input.subjectId, code } },
  });
  if (existing) throw conflict("code already exists");
  return prisma.courseOutcome.create({
    data: { campusId, subjectId: input.subjectId, code, title },
  });
}

export async function listCourseOutcomes(campusId: string, subjectId?: string) {
  return prisma.courseOutcome.findMany({
    where: { campusId, ...(subjectId ? { subjectId } : {}) },
    include: { subject: { select: { id: true, name: true } } },
    orderBy: { code: "asc" },
  });
}

export async function upsertCoPoMapping(
  campusId: string,
  input: { courseOutcomeId: string; programOutcomeId: string; weight: number },
) {
  if (!isMappingWeight(input.weight)) {
    throw validationError({ weight: "must be 0, 1, 2 or 3" });
  }
  const co = await prisma.courseOutcome.findFirst({
    where: { id: input.courseOutcomeId, campusId },
  });
  if (!co) throw notFound("course outcome");
  const po = await prisma.programOutcome.findFirst({
    where: { id: input.programOutcomeId, campusId },
  });
  if (!po) throw notFound("program outcome");
  return prisma.coPoMapping.upsert({
    where: {
      courseOutcomeId_programOutcomeId: {
        courseOutcomeId: co.id,
        programOutcomeId: po.id,
      },
    },
    update: { weight: input.weight },
    create: {
      courseOutcomeId: co.id,
      programOutcomeId: po.id,
      weight: input.weight,
    },
  });
}

export async function listCoPoMappings(campusId: string) {
  return prisma.coPoMapping.findMany({
    where: { courseOutcome: { campusId } },
    include: {
      courseOutcome: { select: { id: true, code: true, title: true } },
      programOutcome: { select: { id: true, code: true, title: true } },
    },
    orderBy: { weight: "desc" },
  });
}

export async function linkCoAssessment(
  campusId: string,
  input: { courseOutcomeId: string; examSubjectId: string },
) {
  const co = await prisma.courseOutcome.findFirst({
    where: { id: input.courseOutcomeId, campusId },
  });
  if (!co) throw notFound("course outcome");
  const paper = await prisma.examSubject.findFirst({
    where: { id: input.examSubjectId, exam: { group: { campusId } } },
  });
  if (!paper) throw notFound("exam subject");
  const existing = await prisma.coAssessment.findUnique({
    where: {
      courseOutcomeId_examSubjectId: {
        courseOutcomeId: co.id,
        examSubjectId: paper.id,
      },
    },
  });
  if (existing) throw conflict("already linked");
  return prisma.coAssessment.create({
    data: { courseOutcomeId: co.id, examSubjectId: paper.id },
  });
}

export async function setIndirectPo(
  campusId: string,
  input: { programOutcomeId: string; percent: number | string },
) {
  const po = await prisma.programOutcome.findFirst({
    where: { id: input.programOutcomeId, campusId },
  });
  if (!po) throw notFound("program outcome");
  const percent = dec(input.percent);
  if (percent.lt(0) || percent.gt(100)) {
    throw validationError({ percent: "must be 0-100" });
  }
  return prisma.indirectPoScore.upsert({
    where: { programOutcomeId: po.id },
    update: { percent },
    create: { programOutcomeId: po.id, percent },
  });
}

export async function createCopoLesson(
  campusId: string,
  input: { subjectId: string; title: string; courseOutcomeId?: string },
) {
  await subjectInCampus(campusId, input.subjectId);
  if (input.courseOutcomeId) {
    const co = await prisma.courseOutcome.findFirst({
      where: { id: input.courseOutcomeId, campusId, subjectId: input.subjectId },
    });
    if (!co) throw notFound("course outcome");
  }
  const title = input.title.trim();
  if (!title) throw validationError({ title: "required" });
  return prisma.copoLesson.create({
    data: {
      campusId,
      subjectId: input.subjectId,
      courseOutcomeId: input.courseOutcomeId,
      title,
    },
  });
}

export async function listCopoLessons(campusId: string) {
  return prisma.copoLesson.findMany({
    where: { campusId },
    include: {
      subject: { select: { name: true } },
      courseOutcome: { select: { code: true } },
    },
    orderBy: { title: "asc" },
  });
}

export async function reviewCopoLesson(
  campusId: string,
  lessonId: string,
  status: CopoLessonStatus,
) {
  if (status !== CopoLessonStatus.APPROVED && status !== CopoLessonStatus.REJECTED) {
    throw validationError({ status: "approve or reject" });
  }
  const lesson = await prisma.copoLesson.findFirst({
    where: { id: lessonId, campusId },
  });
  if (!lesson) throw notFound("lesson");
  if (lesson.status !== CopoLessonStatus.SUBMITTED) {
    throw validationError({ status: "only submitted plans can be reviewed" });
  }
  return prisma.copoLesson.update({
    where: { id: lesson.id },
    data: { status },
  });
}

async function courseOutcomePercent(campusId: string, courseOutcomeId: string) {
  const assessments = await prisma.coAssessment.findMany({
    where: { courseOutcomeId, courseOutcome: { campusId } },
    include: {
      examSubject: { include: { marks: true } },
    },
  });
  const percents = assessments.map((a) =>
    directAttainmentPercent(
      a.examSubject.marks.map((m) => ({
        marks: m.marks === null ? null : Number(m.marks),
        isAbsent: m.isAbsent,
        minMarks: Number(a.examSubject.minMarks),
      })),
    ),
  );
  return averagePercents(percents);
}

export async function copoAttainment(campusId: string, programId: string) {
  await programInCampus(campusId, programId);
  const pos = await prisma.programOutcome.findMany({
    where: { campusId, programId },
    include: {
      indirect: true,
      mappings: { include: { courseOutcome: true } },
    },
    orderBy: { code: "asc" },
  });
  const result = [];
  for (const po of pos) {
    const links = [];
    for (const map of po.mappings) {
      const coPercent = await courseOutcomePercent(campusId, map.courseOutcomeId);
      links.push({
        co: map.courseOutcome.code,
        weight: map.weight,
        coPercent,
      });
    }
    const direct = weightedPoDirect(links);
    const indirect = po.indirect ? Number(po.indirect.percent) : null;
    result.push({
      id: po.id,
      code: po.code,
      title: po.title,
      kind: po.kind,
      direct,
      indirect,
      overall: overallPo(direct, indirect),
      links,
    });
  }
  return result;
}

export type CopoAttainmentRow = Awaited<ReturnType<typeof copoAttainment>>[number];

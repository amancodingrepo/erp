import { NaacAssignmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import {
  NAAC_CRITERIA,
  criterionCompletionPercent,
  safeEvidenceUrl,
} from "@/lib/naac-criteria";

export async function ensureNaacCriteria(campusId: string) {
  for (const row of NAAC_CRITERIA) {
    await prisma.naacCriterion.upsert({
      where: { campusId_number: { campusId, number: row.number } },
      update: { title: row.title },
      create: { campusId, number: row.number, title: row.title },
    });
  }
  return prisma.naacCriterion.findMany({
    where: { campusId },
    orderBy: { number: "asc" },
  });
}

export async function createNaacTask(
  campusId: string,
  input: {
    criterionId?: string;
    criterionNumber?: number;
    title: string;
    keyIndicator?: string;
    dueOn?: string;
    evidenceRequired?: boolean;
  },
) {
  const title = input.title.trim();
  if (!title) throw validationError({ title: "required" });
  await ensureNaacCriteria(campusId);
  const criterion = input.criterionId
    ? await prisma.naacCriterion.findFirst({
        where: { id: input.criterionId, campusId },
      })
    : await prisma.naacCriterion.findFirst({
        where: { campusId, number: input.criterionNumber ?? 0 },
      });
  if (!criterion) throw notFound("criterion");
  return prisma.naacTask.create({
    data: {
      campusId,
      criterionId: criterion.id,
      title,
      keyIndicator: input.keyIndicator?.trim() || undefined,
      dueOn: input.dueOn ? new Date(input.dueOn) : undefined,
      evidenceRequired: input.evidenceRequired ?? true,
    },
  });
}

export async function listNaacTasks(campusId: string) {
  await ensureNaacCriteria(campusId);
  return prisma.naacTask.findMany({
    where: { campusId },
    include: {
      criterion: true,
      assignments: { include: { staff: true } },
      evidence: true,
    },
    orderBy: [{ criterion: { number: "asc" } }, { title: "asc" }],
  });
}

export async function assignNaacTask(
  campusId: string,
  taskId: string,
  staffId: string,
) {
  const task = await prisma.naacTask.findFirst({ where: { id: taskId, campusId } });
  if (!task) throw notFound("task");
  const staff = await prisma.staff.findFirst({ where: { id: staffId, campusId } });
  if (!staff) throw notFound("staff");
  const existing = await prisma.naacAssignment.findUnique({
    where: { taskId_staffId: { taskId: task.id, staffId: staff.id } },
  });
  if (existing) throw conflict("already assigned");
  return prisma.naacAssignment.create({
    data: { taskId: task.id, staffId: staff.id },
  });
}

export async function addNaacEvidence(
  campusId: string,
  taskId: string,
  input: { note?: string; fileUrl: string },
) {
  const task = await prisma.naacTask.findFirst({ where: { id: taskId, campusId } });
  if (!task) throw notFound("task");
  const fileUrl = safeEvidenceUrl(input.fileUrl);
  if (!fileUrl) throw validationError({ fileUrl: "invalid" });
  return prisma.naacEvidence.create({
    data: {
      taskId: task.id,
      note: input.note?.trim() || undefined,
      fileUrl,
    },
  });
}

export async function completeNaacAssignment(campusId: string, assignmentId: string) {
  const assignment = await prisma.naacAssignment.findFirst({
    where: { id: assignmentId, task: { campusId } },
    include: { task: { include: { evidence: true } } },
  });
  if (!assignment) throw notFound("assignment");
  if (assignment.status === NaacAssignmentStatus.DONE) {
    throw validationError({ status: "already done" });
  }
  if (assignment.task.evidenceRequired && assignment.task.evidence.length === 0) {
    throw validationError({ evidence: "evidence required" });
  }
  return prisma.naacAssignment.update({
    where: { id: assignment.id },
    data: { status: NaacAssignmentStatus.DONE },
  });
}

export async function naacDashboard(campusId: string) {
  await ensureNaacCriteria(campusId);
  const criteria = await prisma.naacCriterion.findMany({
    where: { campusId },
    include: {
      tasks: { include: { assignments: true, evidence: true } },
    },
    orderBy: { number: "asc" },
  });
  return criteria.map((c) => {
    const assignments = c.tasks.flatMap((t) => t.assignments);
    const done = assignments.filter((a) => a.status === NaacAssignmentStatus.DONE).length;
    return {
      id: c.id,
      number: c.number,
      title: c.title,
      tasks: c.tasks.length,
      evidence: c.tasks.reduce((n, t) => n + t.evidence.length, 0),
      assignments: assignments.length,
      done,
      percent: criterionCompletionPercent(done, assignments.length),
    };
  });
}

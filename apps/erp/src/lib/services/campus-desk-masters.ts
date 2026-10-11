import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { dropLeaveMarksForLeaveType } from "@/lib/services/academics-masters";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function leaveTypeDeleteBlocked(requestCount: number) {
  return requestCount > 0;
}

export function periodDeleteBlocked(slotCount: number) {
  return slotCount > 0;
}

export function gradePatchData(
  existing: {
    name: string;
    letter: string;
    minPct: unknown;
    maxPct: unknown;
    points: unknown;
  },
  patch: {
    name?: string;
    letter?: string;
    minPct?: number;
    maxPct?: number;
    points?: number | null;
  },
) {
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  const letter = patch.letter !== undefined ? trim(patch.letter) : existing.letter;
  if (!name) throw validationError({ name: "required" });
  if (!letter) throw validationError({ letter: "required" });
  const minPct = patch.minPct !== undefined ? patch.minPct : Number(existing.minPct);
  const maxPct = patch.maxPct !== undefined ? patch.maxPct : Number(existing.maxPct);
  if (!Number.isFinite(minPct) || minPct < 0) throw validationError({ minPct: "invalid" });
  if (!Number.isFinite(maxPct) || maxPct < 0) throw validationError({ maxPct: "invalid" });
  if (minPct > maxPct) throw validationError({ maxPct: "must be >= minPct" });
  return {
    name,
    letter,
    minPct,
    maxPct,
    ...(patch.points !== undefined ? { points: patch.points } : {}),
  };
}

export function leaveTypePatchData(
  existing: { name: string; daysYear: number },
  patch: { name?: string; daysYear?: number },
) {
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  if (!name) throw validationError({ name: "required" });
  return {
    name,
    ...(patch.daysYear !== undefined ? { daysYear: patch.daysYear } : {}),
  };
}

export function periodPatchData(
  existing: {
    name: string;
    startTime: string;
    endTime: string;
    sortOrder: number;
  },
  patch: {
    name?: string;
    startTime?: string;
    endTime?: string;
    sortOrder?: number;
  },
) {
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  const startTime =
    patch.startTime !== undefined ? trim(patch.startTime) : existing.startTime;
  const endTime = patch.endTime !== undefined ? trim(patch.endTime) : existing.endTime;
  if (!name) throw validationError({ name: "required" });
  if (!startTime) throw validationError({ startTime: "required" });
  if (!endTime) throw validationError({ endTime: "required" });
  return {
    name,
    startTime,
    endTime,
    ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
  };
}

export async function getGrade(campusId: string, id: string) {
  const row = await prisma.grade.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("grade");
  return row;
}

export async function patchGrade(
  campusId: string,
  id: string,
  patch: {
    name?: string;
    letter?: string;
    minPct?: number;
    maxPct?: number;
    points?: number | null;
  },
) {
  const existing = await getGrade(campusId, id);
  const data = gradePatchData(existing, patch);
  return prisma.grade.update({ where: { id: existing.id }, data });
}

export async function removeGrade(campusId: string, id: string) {
  const existing = await getGrade(campusId, id);
  await prisma.grade.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

export async function getLeaveType(campusId: string, id: string) {
  const row = await prisma.leaveType.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("leave type");
  return row;
}

export async function patchLeaveType(
  campusId: string,
  id: string,
  patch: { name?: string; daysYear?: number },
) {
  const existing = await getLeaveType(campusId, id);
  const data = leaveTypePatchData(existing, patch);
  return prisma.leaveType.update({ where: { id: existing.id }, data });
}

export async function removeLeaveType(campusId: string, id: string) {
  const existing = await getLeaveType(campusId, id);
  const requests = await prisma.leaveRequest.count({
    where: { leaveTypeId: existing.id },
  });
  if (leaveTypeDeleteBlocked(requests)) throw conflict("leave type is in use");
  await dropLeaveMarksForLeaveType(campusId, existing.id);
  await prisma.leaveType.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

export async function getPeriod(campusId: string, id: string) {
  const row = await prisma.period.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("period");
  return row;
}

export async function patchPeriod(
  campusId: string,
  id: string,
  patch: {
    name?: string;
    startTime?: string;
    endTime?: string;
    sortOrder?: number;
  },
) {
  const existing = await getPeriod(campusId, id);
  const data = periodPatchData(existing, patch);
  return prisma.period.update({ where: { id: existing.id }, data });
}

export async function removePeriod(campusId: string, id: string) {
  const existing = await getPeriod(campusId, id);
  const slots = await prisma.timetableSlot.count({
    where: { periodId: existing.id },
  });
  if (periodDeleteBlocked(slots)) throw conflict("period is in use");
  await prisma.period.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

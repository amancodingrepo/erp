import { ProgramLevel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function programDeleteBlocked(counts: {
  classes: number;
  applications: number;
  outcomes: number;
  specializations: number;
  cutoffRules: number;
}) {
  return (
    counts.classes > 0 ||
    counts.applications > 0 ||
    counts.outcomes > 0 ||
    counts.specializations > 0 ||
    counts.cutoffRules > 0
  );
}

export function programPatchData(
  existing: {
    name: string;
    code: string | null;
    level: ProgramLevel;
    durationYears: number;
  },
  patch: {
    name?: string;
    code?: string | null;
    level?: ProgramLevel;
    durationYears?: number;
  },
) {
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  if (!name) throw validationError({ name: "required" });
  const durationYears =
    patch.durationYears !== undefined ? patch.durationYears : existing.durationYears;
  if (!Number.isInteger(durationYears) || durationYears < 1) {
    throw validationError({ durationYears: "invalid" });
  }
  return {
    name,
    durationYears,
    ...(patch.code !== undefined ? { code: trim(patch.code) || null } : {}),
    ...(patch.level !== undefined ? { level: patch.level } : {}),
  };
}

const programInclude = { department: true } as const;

export async function getProgram(campusId: string, id: string) {
  const row = await prisma.program.findFirst({
    where: { id: trim(id), department: { campusId } },
    include: programInclude,
  });
  if (!row) throw notFound("program");
  return row;
}

export async function patchProgram(
  campusId: string,
  id: string,
  patch: {
    name?: string;
    code?: string | null;
    level?: ProgramLevel;
    durationYears?: number;
    departmentId?: string;
  },
) {
  const existing = await getProgram(campusId, id);
  const data = programPatchData(existing, patch);
  let departmentId: string | undefined;
  if (patch.departmentId !== undefined) {
    const department = await prisma.department.findFirst({
      where: { id: trim(patch.departmentId), campusId },
      select: { id: true },
    });
    if (!department) throw notFound("department");
    departmentId = department.id;
  }
  return prisma.program.update({
    where: { id: existing.id },
    data: {
      ...data,
      ...(departmentId !== undefined ? { departmentId } : {}),
    },
    include: programInclude,
  });
}

export async function removeProgram(campusId: string, id: string) {
  const existing = await getProgram(campusId, id);
  const [classes, applications, outcomes, specializations, cutoffRules] =
    await Promise.all([
      prisma.class.count({ where: { programId: existing.id } }),
      prisma.application.count({ where: { programId: existing.id } }),
      prisma.programOutcome.count({ where: { programId: existing.id } }),
      prisma.specialization.count({ where: { programId: existing.id } }),
      prisma.cutoffRule.count({ where: { programId: existing.id } }),
    ]);
  if (
    programDeleteBlocked({
      classes,
      applications,
      outcomes,
      specializations,
      cutoffRules,
    })
  ) {
    throw conflict("program is in use");
  }
  await prisma.program.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

import { prisma } from "@/lib/db";
import { conflict, notFound, prismaErrorCode, validationError } from "@/lib/errors";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function orgMasterDeleteBlocked(relatedCount: number) {
  return relatedCount > 0;
}

export function orgMasterPatchData(
  existing: { name: string; code?: string | null },
  patch: { name?: string; code?: string },
) {
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  if (!name) throw validationError({ name: "required" });
  return {
    name,
    ...(patch.code !== undefined ? { code: trim(patch.code) || null } : {}),
  };
}

async function updateOrConflict<T>(work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if (prismaErrorCode(error) === "P2002") throw conflict("duplicate name");
    throw error;
  }
}

export async function getDepartment(campusId: string, id: string) {
  const row = await prisma.department.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("department");
  return row;
}

export async function patchDepartment(
  campusId: string,
  id: string,
  patch: { name?: string; code?: string },
) {
  const existing = await getDepartment(campusId, id);
  const data = orgMasterPatchData(existing, patch);
  return updateOrConflict(() =>
    prisma.department.update({ where: { id: existing.id }, data }),
  );
}

export async function removeDepartment(campusId: string, id: string) {
  const existing = await getDepartment(campusId, id);
  const [programs, staff] = await Promise.all([
    prisma.program.count({ where: { departmentId: existing.id } }),
    prisma.staff.count({ where: { departmentId: existing.id } }),
  ]);
  if (orgMasterDeleteBlocked(programs + staff)) {
    throw conflict("department is in use");
  }
  await prisma.department.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

export async function getDesignation(campusId: string, id: string) {
  const row = await prisma.designation.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("designation");
  return row;
}

export async function patchDesignation(
  campusId: string,
  id: string,
  patch: { name?: string },
) {
  const existing = await getDesignation(campusId, id);
  const data = orgMasterPatchData(existing, patch);
  return updateOrConflict(() =>
    prisma.designation.update({
      where: { id: existing.id },
      data: { name: data.name },
    }),
  );
}

export async function removeDesignation(campusId: string, id: string) {
  const existing = await getDesignation(campusId, id);
  const staff = await prisma.staff.count({ where: { designationId: existing.id } });
  if (orgMasterDeleteBlocked(staff)) throw conflict("designation is in use");
  await prisma.designation.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

export async function getCategory(campusId: string, id: string) {
  const row = await prisma.category.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("category");
  return row;
}

export async function patchCategory(
  campusId: string,
  id: string,
  patch: { name?: string; code?: string },
) {
  const existing = await getCategory(campusId, id);
  const data = orgMasterPatchData(existing, patch);
  return updateOrConflict(() =>
    prisma.category.update({ where: { id: existing.id }, data }),
  );
}

export async function removeCategory(campusId: string, id: string) {
  const existing = await getCategory(campusId, id);
  const students = await prisma.student.count({ where: { categoryId: existing.id } });
  if (orgMasterDeleteBlocked(students)) throw conflict("category is in use");
  await prisma.category.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

export async function getDisableReason(campusId: string, id: string) {
  const row = await prisma.disableReason.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("disable reason");
  return row;
}

export async function patchDisableReason(
  campusId: string,
  id: string,
  patch: { name?: string },
) {
  const existing = await getDisableReason(campusId, id);
  const data = orgMasterPatchData(existing, patch);
  return updateOrConflict(() =>
    prisma.disableReason.update({
      where: { id: existing.id },
      data: { name: data.name },
    }),
  );
}

export async function removeDisableReason(campusId: string, id: string) {
  const existing = await getDisableReason(campusId, id);
  const students = await prisma.student.count({
    where: { disableReasonId: existing.id },
  });
  if (orgMasterDeleteBlocked(students)) throw conflict("disable reason is in use");
  await prisma.disableReason.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

export async function getFeeGroup(campusId: string, id: string) {
  const row = await prisma.feeGroup.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("fee group");
  return row;
}

export async function patchFeeGroup(
  campusId: string,
  id: string,
  patch: { name?: string },
) {
  const existing = await getFeeGroup(campusId, id);
  const data = orgMasterPatchData(existing, patch);
  return updateOrConflict(() =>
    prisma.feeGroup.update({
      where: { id: existing.id },
      data: { name: data.name },
    }),
  );
}

export async function removeFeeGroup(campusId: string, id: string) {
  const existing = await getFeeGroup(campusId, id);
  const masters = await prisma.feeMaster.count({ where: { groupId: existing.id } });
  if (orgMasterDeleteBlocked(masters)) throw conflict("fee group is in use");
  await prisma.feeGroup.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

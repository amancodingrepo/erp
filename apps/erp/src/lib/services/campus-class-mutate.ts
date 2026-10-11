import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { classInCampus } from "@/lib/campus";
import { saveClassFlags } from "@/lib/services/campus-comms";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export type ClassPatch = {
  name?: string;
  yearNo?: number | null;
  sequenceNo?: number;
  isOtherCourse?: boolean;
  isActive?: boolean;
  programId?: string;
};

export function classPatchData(patch: {
  name?: unknown;
  yearNo?: unknown;
  sequenceNo?: unknown;
  isOtherCourse?: unknown;
  isActive?: unknown;
  programId?: unknown;
}): ClassPatch {
  const data: ClassPatch = {};
  if (patch.name !== undefined) {
    const name = trim(patch.name);
    if (!name) throw validationError({ name: "required" });
    data.name = name;
  }
  if (patch.yearNo !== undefined) {
    if (patch.yearNo === null || patch.yearNo === "") {
      data.yearNo = null;
    } else {
      const n = Number(patch.yearNo);
      if (!Number.isInteger(n)) throw validationError({ yearNo: "integer" });
      data.yearNo = n;
    }
  }
  if (patch.sequenceNo !== undefined) {
    const n = Number(patch.sequenceNo);
    if (!Number.isInteger(n)) throw validationError({ sequenceNo: "integer" });
    data.sequenceNo = n;
  }
  if (patch.isOtherCourse !== undefined) data.isOtherCourse = Boolean(patch.isOtherCourse);
  if (patch.isActive !== undefined) data.isActive = Boolean(patch.isActive);
  if (patch.programId !== undefined) {
    const programId = trim(patch.programId);
    if (!programId) throw validationError({ programId: "required" });
    data.programId = programId;
  }
  return data;
}

export function classDeleteBlocked(currentEnrollmentCount: number) {
  return currentEnrollmentCount > 0;
}

export async function patchClass(
  campusId: string,
  classId: string,
  patch: {
    name?: unknown;
    yearNo?: unknown;
    sequenceNo?: unknown;
    isOtherCourse?: unknown;
    isActive?: unknown;
    programId?: unknown;
    sendAbsentSms?: unknown;
    virtualClassroom?: unknown;
  },
) {
  await classInCampus(campusId, classId);
  const data = classPatchData(patch);
  if (data.programId) {
    const program = await prisma.program.findFirst({
      where: { id: data.programId, department: { campusId } },
      select: { id: true },
    });
    if (!program) throw notFound("program");
  }
  const row = Object.keys(data).length
    ? await prisma.class.update({
        where: { id: classId },
        data,
        include: { sections: true, program: true },
      })
    : await prisma.class.findFirstOrThrow({
        where: { id: classId },
        include: { sections: true, program: true },
      });
  if (patch.sendAbsentSms !== undefined || patch.virtualClassroom !== undefined) {
    await saveClassFlags(campusId, {
      classId: row.id,
      sendAbsentSms:
        patch.sendAbsentSms === undefined ? undefined : Boolean(patch.sendAbsentSms),
      virtualClassroom:
        patch.virtualClassroom === undefined
          ? undefined
          : Boolean(patch.virtualClassroom),
    });
  }
  return row;
}

export async function deactivateClass(campusId: string, classId: string) {
  await classInCampus(campusId, classId);
  const current = await prisma.studentEnrollment.count({
    where: { classId, isCurrent: true },
  });
  if (classDeleteBlocked(current)) {
    throw conflict("class has current enrollments");
  }
  return prisma.class.update({
    where: { id: classId },
    data: { isActive: false },
    include: { sections: true },
  });
}

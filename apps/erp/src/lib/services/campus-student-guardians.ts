import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { allowedMediaUrl } from "@/lib/services/campus-files";

export const GUARDIAN_EXTRAS_KEY = "students.guardianExtras";

const RELATIONS = new Set(["father", "mother", "spouse", "other", "guardian"]);

export type GuardianExtra = {
  guardianId: string;
  aadhaar?: string;
  altPhone?: string;
  education?: string;
  photoUrl?: string;
  residentialAddress?: string;
  permanentAddress?: string;
  sameAsResidential: boolean;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}



async function readSetting(campusId: string, key: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key } },
  });
  return row?.value;
}

async function writeSetting(
  campusId: string,
  key: string,
  value: Prisma.InputJsonValue,
) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key } },
    update: { value },
    create: { campusId, key, value },
  });
}

export function parseGuardianExtras(value: unknown): GuardianExtra[] {
  if (!Array.isArray(value)) return [];
  const out: GuardianExtra[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const guardianId = trim(rec.guardianId);
    if (!guardianId || seen.has(guardianId)) continue;
    seen.add(guardianId);
    out.push({
      guardianId,
      aadhaar: trim(rec.aadhaar) || undefined,
      altPhone: trim(rec.altPhone) || undefined,
      education: trim(rec.education) || undefined,
      photoUrl: allowedMediaUrl(rec.photoUrl) || undefined,
      residentialAddress: trim(rec.residentialAddress) || undefined,
      permanentAddress: trim(rec.permanentAddress) || undefined,
      sameAsResidential: Boolean(rec.sameAsResidential),
    });
  }
  return out;
}

export function parseGuardianExtra(guardianId: string, input: unknown): GuardianExtra {
  const rec =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const id = trim(guardianId);
  if (!id) throw validationError({ guardianId: "required" });
  const aadhaarDigits = trim(rec.aadhaar).replace(/\D/g, "");
  if (trim(rec.aadhaar) && aadhaarDigits.length !== 12) {
    throw validationError({ aadhaar: "12 digits" });
  }
  const photoRaw = trim(rec.photoUrl);
  const photoUrl = photoRaw ? allowedMediaUrl(rec.photoUrl) : "";
  if (photoRaw && !photoUrl) {
    throw validationError({ photoUrl: "https or hosted file required" });
  }
  const residentialAddress = trim(rec.residentialAddress);
  const sameAsResidential = Boolean(rec.sameAsResidential);
  const permanentAddress = sameAsResidential
    ? residentialAddress
    : trim(rec.permanentAddress);
  return {
    guardianId: id,
    aadhaar: aadhaarDigits || undefined,
    altPhone: trim(rec.altPhone) || undefined,
    education: trim(rec.education) || undefined,
    photoUrl: photoUrl || undefined,
    residentialAddress: residentialAddress || undefined,
    permanentAddress: permanentAddress || undefined,
    sameAsResidential,
  };
}

export function upsertGuardianExtra(rows: GuardianExtra[], extra: GuardianExtra) {
  return [...rows.filter((row) => row.guardianId !== extra.guardianId), extra];
}

export function attachGuardianExtras<T extends { guardianId: string }>(
  links: T[],
  rows: GuardianExtra[],
) {
  const byId = new Map(rows.map((row) => [row.guardianId, row]));
  return links.map((link) => {
    const extra = byId.get(link.guardianId);
    if (!extra) return { ...link };
    return {
      ...link,
      aadhaar: extra.aadhaar,
      altPhone: extra.altPhone,
      education: extra.education,
      photoUrl: extra.photoUrl,
      residentialAddress: extra.residentialAddress,
      permanentAddress: extra.permanentAddress,
      sameAsResidential: extra.sameAsResidential,
    };
  });
}

export async function listGuardianExtras(campusId: string) {
  return parseGuardianExtras(await readSetting(campusId, GUARDIAN_EXTRAS_KEY));
}

export async function saveGuardianExtra(
  campusId: string,
  guardianId: string,
  input: unknown,
) {
  const extra = parseGuardianExtra(guardianId, input);
  const next = upsertGuardianExtra(await listGuardianExtras(campusId), extra);
  await writeSetting(campusId, GUARDIAN_EXTRAS_KEY, next);
  return extra;
}

export function parseGuardianWrite(input: unknown) {
  if (!input || typeof input !== "object") {
    throw validationError({ guardian: "required" });
  }
  const rec = input as Record<string, unknown>;
  const name = trim(rec.name);
  if (!name) throw validationError({ name: "required" });
  const relation = trim(rec.relation || "other").toLowerCase();
  if (!RELATIONS.has(relation)) throw validationError({ relation: "unknown" });
  const phone = trim(rec.phone);
  const email = trim(rec.email);
  const occupation = trim(rec.occupation);
  return {
    relation,
    name,
    phone: phone || undefined,
    email: email || undefined,
    occupation: occupation || undefined,
  };
}

export async function listStudentGuardians(campusId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, campusId },
    select: { id: true },
  });
  if (!student) throw notFound("student");
  const data = await prisma.studentGuardian.findMany({
    where: { studentId: student.id },
    include: { guardian: true },
    orderBy: { relation: "asc" },
  });
  return {
    studentId: student.id,
    data: attachGuardianExtras(data, await listGuardianExtras(campusId)),
  };
}

export async function addStudentGuardian(
  campusId: string,
  studentId: string,
  input: unknown,
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, campusId },
    select: { id: true },
  });
  if (!student) throw notFound("student");
  const body = parseGuardianWrite(input);
  const existing = await prisma.studentGuardian.findFirst({
    where: { studentId: student.id, relation: body.relation },
  });
  if (existing) {
    await prisma.guardian.update({
      where: { id: existing.guardianId },
      data: {
        name: body.name,
        phone: body.phone ?? null,
        email: body.email ?? null,
        occupation: body.occupation ?? null,
      },
    });
    await saveGuardianExtra(campusId, existing.guardianId, input);
    return listStudentGuardians(campusId, student.id);
  }
  const guardian = await prisma.guardian.create({
    data: {
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      occupation: body.occupation ?? null,
    },
  });
  await prisma.studentGuardian.create({
    data: {
      studentId: student.id,
      guardianId: guardian.id,
      relation: body.relation,
    },
  });
  await saveGuardianExtra(campusId, guardian.id, input);
  return listStudentGuardians(campusId, student.id);
}

export async function patchGuardian(
  campusId: string,
  guardianId: string,
  input: unknown,
) {
  const link = await prisma.studentGuardian.findFirst({
    where: { guardianId, student: { campusId } },
    include: { guardian: true },
  });
  if (!link) throw notFound("guardian");
  const rec = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const name = rec.name == null ? link.guardian.name : trim(rec.name);
  if (!name) throw validationError({ name: "required" });
  const relation = rec.relation == null ? link.relation : trim(rec.relation).toLowerCase();
  if (!RELATIONS.has(relation)) throw validationError({ relation: "unknown" });
  await prisma.guardian.update({
    where: { id: link.guardianId },
    data: {
      name,
      phone: rec.phone == null ? link.guardian.phone : trim(rec.phone) || null,
      email: rec.email == null ? link.guardian.email : trim(rec.email) || null,
      occupation:
        rec.occupation == null
          ? link.guardian.occupation
          : trim(rec.occupation) || null,
    },
  });
  if (relation !== link.relation) {
    const clash = await prisma.studentGuardian.findFirst({
      where: {
        studentId: link.studentId,
        relation,
        guardianId: { not: link.guardianId },
      },
    });
    if (clash) throw validationError({ relation: "duplicate" });
    await prisma.studentGuardian.delete({
      where: {
        studentId_guardianId_relation: {
          studentId: link.studentId,
          guardianId: link.guardianId,
          relation: link.relation,
        },
      },
    });
    await prisma.studentGuardian.create({
      data: {
        studentId: link.studentId,
        guardianId: link.guardianId,
        relation,
      },
    });
  }
  await saveGuardianExtra(campusId, link.guardianId, rec);
  return listStudentGuardians(campusId, link.studentId);
}

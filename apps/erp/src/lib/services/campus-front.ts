import { createHmac, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, prismaErrorCode, validationError } from "@/lib/errors";
import { requireAuthSecret } from "@/lib/secrets";

export const PICKUP_AUTH_KEY = "students.pickupAuth";
export const CCTV_CAMERAS_KEY = "campus.cctvCameras";

export type PickupAuth = {
  id: string;
  studentId: string;
  name: string;
  phone: string;
  relation: string;
  pinHash: string;
};

export type CctvCamera = {
  id: string;
  name: string;
  room: string;
  url: string;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function hashPickupPin(studentId: string, pin: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`${studentId}:${pin}`)
    .digest("hex");
}

function pinEquals(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parsePickupAuth(value: unknown): PickupAuth[] {
  if (!Array.isArray(value)) return [];
  const out: PickupAuth[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const studentId = trim(rec.studentId);
    const name = trim(rec.name);
    const pinHash = trim(rec.pinHash);
    if (!id || !studentId || !name || !pinHash || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      studentId,
      name,
      phone: trim(rec.phone),
      relation: trim(rec.relation),
      pinHash,
    });
  }
  return out;
}

export function upsertPickupAuth(
  rows: PickupAuth[],
  input: {
    id?: string;
    studentId: string;
    name: string;
    phone?: string;
    relation?: string;
    pin: string;
    secret: string;
  },
) {
  const studentId = trim(input.studentId);
  const name = trim(input.name);
  const pin = trim(input.pin);
  if (!studentId) throw validationError({ studentId: "required" });
  if (!name) throw validationError({ name: "required" });
  if (!/^\d{4,6}$/.test(pin)) throw validationError({ pin: "4-6 digits" });
  const id = trim(input.id) || crypto.randomUUID();
  const next: PickupAuth = {
    id,
    studentId,
    name,
    phone: trim(input.phone),
    relation: trim(input.relation),
    pinHash: hashPickupPin(studentId, pin, input.secret),
  };
  return [...rows.filter((row) => row.id !== id), next];
}

export function verifyPickupPin(
  rows: PickupAuth[],
  studentId: string,
  pin: string,
  secret: string,
) {
  const sid = trim(studentId);
  const code = trim(pin);
  const expected = hashPickupPin(sid, code, secret);
  return (
    rows.find(
      (row) => row.studentId === sid && pinEquals(row.pinHash, expected),
    ) ?? null
  );
}

export function publicPickup(row: PickupAuth) {
  return {
    id: row.id,
    studentId: row.studentId,
    name: row.name,
    phone: row.phone,
    relation: row.relation,
  };
}

function httpsUrl(value: unknown) {
  const url = trim(value);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function parseCctvCameras(value: unknown): CctvCamera[] {
  if (!Array.isArray(value)) return [];
  const out: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const name = trim(rec.name);
    const url = httpsUrl(rec.url);
    if (!id || !name || !url || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name, room: trim(rec.room), url });
  }
  return out;
}

export function dropCctvCamera(rows: CctvCamera[], id: string) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const next = rows.filter((row) => row.id !== key);
  if (next.length === rows.length) throw notFound("camera");
  return next;
}

export function patchCctvCameraRow(
  rows: CctvCamera[],
  id: string,
  patch: { name?: string; room?: string; url?: string },
) {
  const key = trim(id);
  const existing = rows.find((row) => row.id === key);
  if (!existing) throw notFound("camera");
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  const url = patch.url !== undefined ? httpsUrl(patch.url) : existing.url;
  if (!name) throw validationError({ name: "required" });
  if (patch.url !== undefined && !url) throw validationError({ url: "https required" });
  return upsertCctvCamera(rows, {
    id: existing.id,
    name,
    room: patch.room !== undefined ? trim(patch.room) : existing.room,
    url,
  });
}

export function upsertCctvCamera(
  rows: CctvCamera[],
  input: { id?: string; name: string; room?: string; url: string },
) {
  const name = trim(input.name);
  const url = httpsUrl(input.url);
  if (!name) throw validationError({ name: "required" });
  if (!url) throw validationError({ url: "https required" });
  const id = trim(input.id) || crypto.randomUUID();
  const next: CctvCamera = { id, name, room: trim(input.room), url };
  return [...rows.filter((row) => row.id !== id), next];
}

export function parentCctvCameras(rows: CctvCamera[], allowCctv: boolean) {
  if (!allowCctv) return [];
  return rows;
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

export async function listPickupAuth(campusId: string, studentId?: string) {
  const rows = parsePickupAuth(await readSetting(campusId, PICKUP_AUTH_KEY));
  return studentId ? rows.filter((row) => row.studentId === studentId) : rows;
}

export async function savePickupAuth(
  campusId: string,
  input: {
    id?: string;
    studentId: string;
    name: string;
    phone?: string;
    relation?: string;
    pin: string;
  },
) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId },
  });
  if (!student) throw notFound("student");
  const next = upsertPickupAuth(await listPickupAuth(campusId), {
    ...input,
    secret: requireAuthSecret(),
  });
  await writeSetting(campusId, PICKUP_AUTH_KEY, next);
  const saved =
    next.find((row) => row.id === trim(input.id)) ??
    next.find(
      (row) =>
        row.studentId === student.id && row.name === trim(input.name),
    );
  if (!saved) throw notFound("pickup");
  return publicPickup(saved);
}

export async function checkPickupPin(
  campusId: string,
  studentId: string,
  pin: string,
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, campusId },
  });
  if (!student) throw notFound("student");
  const match = verifyPickupPin(
    await listPickupAuth(campusId, studentId),
    studentId,
    pin,
    requireAuthSecret(),
  );
  if (!match) throw validationError({ pin: "not authorised" });
  return {
    ok: true,
    student: {
      id: student.id,
      admissionNo: student.admissionNo,
      name: [student.firstName, student.lastName].filter(Boolean).join(" "),
    },
    pickup: publicPickup(match),
  };
}

export async function listCctvCameras(campusId: string) {
  return parseCctvCameras(await readSetting(campusId, CCTV_CAMERAS_KEY));
}

export async function saveCctvCamera(
  campusId: string,
  input: { id?: string; name: string; room?: string; url: string },
) {
  const next = upsertCctvCamera(await listCctvCameras(campusId), input);
  await writeSetting(campusId, CCTV_CAMERAS_KEY, next);
  return next.find((row) => row.name === trim(input.name))!;
}

export async function getCctvCamera(campusId: string, id: string) {
  const row = (await listCctvCameras(campusId)).find((item) => item.id === trim(id));
  if (!row) throw notFound("camera");
  return row;
}

export async function patchCctvCamera(
  campusId: string,
  id: string,
  patch: { name?: string; room?: string; url?: string },
) {
  const next = patchCctvCameraRow(await listCctvCameras(campusId), id, patch);
  await writeSetting(campusId, CCTV_CAMERAS_KEY, next);
  return next.find((row) => row.id === trim(id))!;
}

export async function removeCctvCamera(campusId: string, id: string) {
  const existing = await getCctvCamera(campusId, id);
  await writeSetting(
    campusId,
    CCTV_CAMERAS_KEY,
    dropCctvCamera(await listCctvCameras(campusId), existing.id),
  );
  return { id: existing.id, deleted: true };
}

export function visitorPatchData(
  existing: {
    name: string;
    phone: string | null;
    purpose: string | null;
    toMeet: string | null;
    note: string | null;
  },
  patch: {
    name?: string;
    phone?: string | null;
    purpose?: string | null;
    toMeet?: string | null;
    note?: string | null;
  },
) {
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  if (!name) throw validationError({ name: "required" });
  return {
    name,
    ...(patch.phone !== undefined ? { phone: trim(patch.phone) || null } : {}),
    ...(patch.purpose !== undefined ? { purpose: trim(patch.purpose) || null } : {}),
    ...(patch.toMeet !== undefined ? { toMeet: trim(patch.toMeet) || null } : {}),
    ...(patch.note !== undefined ? { note: trim(patch.note) || null } : {}),
  };
}

export async function getVisitor(campusId: string, id: string) {
  const row = await prisma.visitor.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("visitor");
  return row;
}

export async function patchVisitor(
  campusId: string,
  id: string,
  patch: {
    name?: string;
    phone?: string | null;
    purpose?: string | null;
    toMeet?: string | null;
    note?: string | null;
  },
) {
  const existing = await getVisitor(campusId, id);
  return prisma.visitor.update({
    where: { id: existing.id },
    data: visitorPatchData(existing, patch),
  });
}

export async function removeVisitor(campusId: string, id: string) {
  const existing = await getVisitor(campusId, id);
  await prisma.visitor.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

export function frontOfficeTypeDeleteBlocked(relatedCount: number) {
  return relatedCount > 0;
}

export function frontOfficeTypePatchData(
  existing: { name: string },
  patch: { name?: string },
) {
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  if (!name) throw validationError({ name: "required" });
  return { name };
}

export async function getFrontOfficeType(campusId: string, id: string) {
  const row = await prisma.frontOfficeType.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("front office type");
  return row;
}

export async function patchFrontOfficeType(
  campusId: string,
  id: string,
  patch: { name?: string },
) {
  const existing = await getFrontOfficeType(campusId, id);
  const data = frontOfficeTypePatchData(existing, patch);
  try {
    return await prisma.frontOfficeType.update({
      where: { id: existing.id },
      data,
    });
  } catch (error) {
    if (prismaErrorCode(error) === "P2002") throw conflict("duplicate name");
    throw error;
  }
}

export async function removeFrontOfficeType(campusId: string, id: string) {
  const existing = await getFrontOfficeType(campusId, id);
  const related =
    existing.kind === "source"
      ? await prisma.enquiry.count({
          where: { campusId, source: existing.name },
        })
      : existing.kind === "purpose"
        ? await prisma.visitor.count({
            where: { campusId, purpose: existing.name },
          })
        : 0;
  if (frontOfficeTypeDeleteBlocked(related)) {
    throw conflict("front office type is in use");
  }
  await prisma.frontOfficeType.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

export async function parentCctvDesk(campusId: string, studentId: string) {
  const daycare = await prisma.studentDaycare.findFirst({
    where: { studentId, student: { campusId } },
  });
  const allowed = Boolean(daycare?.allowCctv);
  return {
    allowed,
    cameras: parentCctvCameras(await listCctvCameras(campusId), allowed),
  };
}

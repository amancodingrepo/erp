import type { Prisma, ScreenRecord } from "@prisma/client";
import { prisma } from "@/lib/db";
import { classInCampus, staffInCampus, subjectInCampus } from "@/lib/campus";
import { conflict, notFound, validationError } from "@/lib/errors";
import {
  REGISTER_KINDS,
  type RegisterKind,
  type RegisterRef,
  parseRegisterPayload,
  parseRegisterStatus,
  registerTitle,
  screenKeyFor,
} from "./registers";

type Payload = Record<string, unknown>;

export function registerRow(row: ScreenRecord) {
  const payload = (row.payload && typeof row.payload === "object" ? row.payload : {}) as Payload;
  return { title: row.title, ...payload, id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

async function checkRef(campusId: string, ref: RegisterRef) {
  const missing = () => validationError({ [ref.key]: "was not found in this campus" });
  const found = async (promise: Promise<unknown>) => { if (!(await promise)) throw missing(); };
  try {
    switch (ref.type) {
      case "staff": await staffInCampus(campusId, ref.id); return;
      case "class": await classInCampus(campusId, ref.id); return;
      case "subject": await subjectInCampus(campusId, ref.id); return;
      case "student": return await found(prisma.student.findFirst({ where: { id: ref.id, campusId }, select: { id: true } }));
      case "program": return await found(prisma.program.findFirst({ where: { id: ref.id, department: { campusId } }, select: { id: true } }));
      case "leaveType": return await found(prisma.leaveType.findFirst({ where: { id: ref.id, campusId }, select: { id: true } }));
      case "examPaper": return await found(prisma.examSubject.findFirst({ where: { id: ref.id, exam: { group: { campusId } } }, select: { id: true } }));
      case "register": return await found(prisma.screenRecord.findFirst({ where: { id: ref.id, campusId, screenKey: screenKeyFor(ref.ref || "") }, select: { id: true } }));
      default: return;
    }
  } catch (error) {
    // campus helpers throw notFound; report it against the field instead.
    if (error && typeof error === "object" && (error as { status?: number }).status === 404) throw missing();
    throw error;
  }
}

async function newCode(campusId: string, def: RegisterKind) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = def.codePrefix + "-" + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 36 * 36).toString(36).toUpperCase().padStart(2, "0");
    const clash = await prisma.screenRecord.findFirst({ where: { campusId, screenKey: screenKeyFor(def.kind), payload: { path: ["code"], equals: code } }, select: { id: true } });
    if (!clash) return code;
  }
  throw conflict("could not create a unique code, try again");
}

const same = (campusId: string, kind: string, key: string, value: unknown) => ({
  campusId,
  screenKey: screenKeyFor(kind),
  payload: { path: [key], equals: value as Prisma.InputJsonValue },
});

/** Rules that span rows, checked on every create and edit. */
async function checkRules(campusId: string, def: RegisterKind, next: Payload, id: string | null, before: Payload | null) {
  if (def.kind === "other-course-applications") {
    const course = await prisma.screenRecord.findFirst({ where: { id: String(next.courseId), campusId, screenKey: screenKeyFor("other-courses") } });
    const info = (course?.payload || {}) as Payload;
    if (!before || before.courseId !== next.courseId) {
      if (!info.open) throw validationError({ courseId: "this course is not open for applications" });
    }
    const dupes = await prisma.screenRecord.findMany({ where: { ...same(campusId, def.kind, "studentId", next.studentId), ...(id ? { id: { not: id } } : {}) }, select: { payload: true } });
    if (dupes.some((d) => (d.payload as Payload)?.courseId === next.courseId)) throw conflict("this student has already applied to this course");
    if (next.status === "Approved" && before?.status !== "Approved" && typeof info.seats === "number") {
      const approved = await prisma.screenRecord.findMany({ where: { ...same(campusId, def.kind, "courseId", next.courseId), ...(id ? { id: { not: id } } : {}) }, select: { payload: true } });
      if (approved.filter((a) => (a.payload as Payload)?.status === "Approved").length >= info.seats) throw conflict(info.seats === 1 ? "the only seat of this course is taken" : "all " + info.seats + " seats of this course are taken");
    }
  }
  if (def.kind === "gatepasses" && (!before || ["Returned", "Cancelled"].includes(String(before.status))) && ["Issued", "Out"].includes(String(next.status))) {
    const open = await prisma.screenRecord.findMany({ where: { ...same(campusId, def.kind, "studentId", next.studentId), ...(id ? { id: { not: id } } : {}) }, select: { payload: true } });
    if (open.some((p) => ["Issued", "Out"].includes(String((p.payload as Payload)?.status)))) throw conflict("this student already has a gate pass that is issued or out");
  }
}

export async function listRegister(campusId: string, def: RegisterKind) {
  const rows = await prisma.screenRecord.findMany({
    where: { campusId, screenKey: screenKeyFor(def.kind) },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  return rows.map(registerRow);
}

export async function createRegister(campusId: string, def: RegisterKind, body: Payload) {
  const { payload, refs } = parseRegisterPayload(def, body);
  for (const ref of refs) await checkRef(campusId, ref);
  const stored: Payload = { ...payload };
  if (def.statuses?.length) stored.status = parseRegisterStatus(def, body.status ?? def.statuses[0]);
  await checkRules(campusId, def, stored, null, null);
  if (def.codePrefix) stored.code = await newCode(campusId, def);
  const row = await prisma.screenRecord.create({
    data: { campusId, screenKey: screenKeyFor(def.kind), title: registerTitle(def, stored), payload: stored as Prisma.InputJsonValue },
  });
  return registerRow(row);
}

async function findRow(campusId: string, def: RegisterKind, id: string) {
  const row = await prisma.screenRecord.findFirst({ where: { id, campusId, screenKey: screenKeyFor(def.kind) } });
  if (!row) throw notFound(def.title.toLowerCase());
  return row;
}

export async function updateRegister(campusId: string, def: RegisterKind, id: string, body: Payload) {
  const row = await findRow(campusId, def, id);
  const before = (row.payload || {}) as Payload;
  const { payload, refs } = parseRegisterPayload(def, body, true);
  // Required fields can't be cleared on edit either.
  const merged: Payload = { ...before, ...payload };
  const { payload: whole } = parseRegisterPayload(def, merged);
  for (const ref of refs) await checkRef(campusId, ref);
  const next: Payload = { ...whole };
  if (def.statuses?.length) next.status = parseRegisterStatus(def, body.status ?? before.status ?? def.statuses[0]);
  if (def.codePrefix) next.code = before.code;
  await checkRules(campusId, def, next, row.id, before);
  const saved = await prisma.screenRecord.update({
    where: { id: row.id },
    data: { title: registerTitle(def, next), payload: next as Prisma.InputJsonValue },
  });
  return { before: registerRow(row), after: registerRow(saved) };
}

export async function deleteRegister(campusId: string, def: RegisterKind, id: string) {
  const row = await findRow(campusId, def, id);
  // Refuse to orphan records in other registers that point at this one.
  for (const other of REGISTER_KINDS) {
    for (const field of other.fields) {
      if (field.type !== "register" || field.ref !== def.kind) continue;
      const used = await prisma.screenRecord.count({
        where: { campusId, screenKey: screenKeyFor(other.kind), payload: { path: [field.key], equals: id } },
      });
      if (used) throw conflict("still used by " + used + " " + other.title.toLowerCase() + (used === 1 ? "" : " records") + "; remove those first");
    }
  }
  await prisma.screenRecord.delete({ where: { id: row.id } });
  return registerRow(row);
}

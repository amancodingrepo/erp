import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, prismaErrorCode, validationError } from "@/lib/errors";
import { queueRendered } from "@/lib/services/messages";

export const CLASS_FLAGS_KEY = "academics.classFlags";
export const EVENT_REMIND_HOURS_KEY = "comms.eventRemindHours";
export const EVENT_REMINDER_LOG_KEY = "comms.eventReminderLog";

export type ClassFlags = {
  classId: string;
  sendAbsentSms: boolean;
  virtualClassroom: boolean;
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

export function parseClassFlags(value: unknown): ClassFlags[] {
  if (!Array.isArray(value)) return [];
  const out: ClassFlags[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const classId = trim(rec.classId);
    if (!classId || seen.has(classId)) continue;
    seen.add(classId);
    out.push({
      classId,
      sendAbsentSms: Boolean(rec.sendAbsentSms),
      virtualClassroom: Boolean(rec.virtualClassroom),
    });
  }
  return out;
}

export function upsertClassFlags(
  rows: ClassFlags[],
  input: { classId: string; sendAbsentSms?: boolean; virtualClassroom?: boolean },
) {
  const classId = trim(input.classId);
  if (!classId) throw validationError({ classId: "required" });
  const previous = rows.find((row) => row.classId === classId);
  const next: ClassFlags = {
    classId,
    sendAbsentSms: input.sendAbsentSms ?? previous?.sendAbsentSms ?? false,
    virtualClassroom: input.virtualClassroom ?? previous?.virtualClassroom ?? false,
  };
  return [...rows.filter((row) => row.classId !== classId), next];
}

export function dropClassFlags(rows: ClassFlags[], classId: string) {
  const key = trim(classId);
  if (!key) throw validationError({ classId: "required" });
  const next = rows.filter((row) => row.classId !== key);
  if (next.length === rows.length) throw notFound("class flags");
  return next;
}

export function flagsForClass(rows: ClassFlags[], classId: string): ClassFlags {
  return (
    rows.find((row) => row.classId === classId) ?? {
      classId,
      sendAbsentSms: false,
      virtualClassroom: false,
    }
  );
}

export function absentSmsBody(input: {
  studentName: string;
  className: string;
  date: string;
}) {
  return `${trim(input.studentName) || "Student"} (${trim(input.className) || "class"}) was marked absent on ${trim(input.date)}.`;
}

export function eventDueForReminder(
  event: { id: string; startsAt: Date },
  now: Date,
  hours: number,
  sentIds: Set<string>,
) {
  if (!event.id || sentIds.has(event.id)) return false;
  const start = event.startsAt.getTime();
  const n = Number.isFinite(hours) ? hours : 24;
  if (Number.isNaN(start) || Number.isNaN(now.getTime()) || n <= 0) return false;
  const delta = start - now.getTime();
  return delta > 0 && delta <= n * 3600000;
}

export function parseEventReminderLog(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    const id = trim(row);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function recordEventReminder(ids: string[], eventId: string) {
  const id = trim(eventId);
  if (!id) throw validationError({ eventId: "required" });
  if (ids.includes(id)) return ids;
  return [...ids, id];
}

export function parseRemindHours(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 24;
  return Math.min(168, Math.trunc(n));
}

export async function listClassFlags(campusId: string) {
  return parseClassFlags(await readSetting(campusId, CLASS_FLAGS_KEY));
}

export async function getClassFlags(campusId: string, classId: string) {
  const klass = await prisma.class.findFirst({
    where: { id: trim(classId), program: { department: { campusId } } },
    select: { id: true },
  });
  if (!klass) throw notFound("class");
  const row = (await listClassFlags(campusId)).find((item) => item.classId === klass.id);
  if (!row) throw notFound("class flags");
  return row;
}

export async function patchClassFlags(
  campusId: string,
  classId: string,
  patch: { sendAbsentSms?: boolean; virtualClassroom?: boolean },
) {
  await getClassFlags(campusId, classId);
  return saveClassFlags(campusId, { classId, ...patch });
}

export async function removeClassFlags(campusId: string, classId: string) {
  const existing = await getClassFlags(campusId, classId);
  const next = dropClassFlags(await listClassFlags(campusId), existing.classId);
  await writeSetting(campusId, CLASS_FLAGS_KEY, next);
  return { id: existing.classId, deleted: true };
}

export async function saveClassFlags(
  campusId: string,
  input: { classId: string; sendAbsentSms?: boolean; virtualClassroom?: boolean },
) {
  const klass = await prisma.class.findFirst({
    where: { id: input.classId, program: { department: { campusId } } },
    select: { id: true },
  });
  if (!klass) throw notFound("class");
  const next = upsertClassFlags(await listClassFlags(campusId), {
    ...input,
    classId: klass.id,
  });
  await writeSetting(campusId, CLASS_FLAGS_KEY, next);
  return next.find((row) => row.classId === klass.id)!;
}

export function attachClassFlags<T extends { id: string }>(
  classes: T[],
  flags: ClassFlags[],
) {
  const byId = new Map(flags.map((row) => [row.classId, row]));
  return classes.map((row) => {
    const flag = byId.get(row.id);
    return {
      ...row,
      sendAbsentSms: flag?.sendAbsentSms ?? false,
      virtualClassroom: flag?.virtualClassroom ?? false,
    };
  });
}

export async function assertVirtualClassroom(campusId: string, classId?: string) {
  if (!classId) return;
  const flags = flagsForClass(await listClassFlags(campusId), classId);
  if (!flags.virtualClassroom) {
    throw validationError({ classId: "virtual classroom disabled" });
  }
}

export async function queueAbsentSms(input: {
  campusId: string;
  classId: string;
  className: string;
  date: string;
  studentIds: string[];
}) {
  if (!input.studentIds.length) return { queued: 0 };
  const flags = flagsForClass(await listClassFlags(input.campusId), input.classId);
  if (!flags.sendAbsentSms) return { queued: 0 };
  const students = await prisma.student.findMany({
    where: { campusId: input.campusId, id: { in: input.studentIds } },
    select: { id: true, firstName: true, lastName: true, mobile: true },
  });
  let queued = 0;
  for (const student of students) {
    const to = trim(student.mobile);
    if (!to) continue;
    const name = [student.firstName, student.lastName].filter(Boolean).join(" ");
    await queueRendered({
      campusId: input.campusId,
      channel: "SMS",
      studentId: student.id,
      to,
      body: absentSmsBody({
        studentName: name,
        className: input.className,
        date: input.date,
      }),
    });
    queued += 1;
  }
  return { queued };
}

export async function sendEmergencySms(input: {
  campusId: string;
  body: string;
  classId?: string;
}) {
  const body = trim(input.body);
  if (!body) throw validationError({ body: "required" });
  const classId = trim(input.classId);
  if (classId) {
    const klass = await prisma.class.findFirst({
      where: { id: classId, program: { department: { campusId: input.campusId } } },
      select: { id: true },
    });
    if (!klass) throw notFound("class");
  }
  const students = await prisma.student.findMany({
    where: {
      campusId: input.campusId,
      status: "ACTIVE",
      ...(classId
        ? { enrollments: { some: { classId, isCurrent: true } } }
        : {}),
    },
    select: { id: true, mobile: true },
    take: 500,
  });
  let queued = 0;
  for (const student of students) {
    const to = trim(student.mobile);
    if (!to) continue;
    await queueRendered({
      campusId: input.campusId,
      channel: "SMS",
      studentId: student.id,
      to,
      body,
    });
    queued += 1;
  }
  return { queued };
}

export async function runEventReminders(campusId: string, now = new Date()) {
  const [hoursRaw, logRaw, events, campus] = await Promise.all([
    readSetting(campusId, EVENT_REMIND_HOURS_KEY),
    readSetting(campusId, EVENT_REMINDER_LOG_KEY),
    prisma.campusEvent.findMany({
      where: { campusId, startsAt: { gt: now } },
      orderBy: { startsAt: "asc" },
      take: 100,
    }),
    prisma.campus.findUnique({ where: { id: campusId }, select: { name: true } }),
  ]);
  const hours = parseRemindHours(hoursRaw);
  let sent = parseEventReminderLog(logRaw);
  const sentSet = new Set(sent);
  let queued = 0;
  for (const event of events) {
    if (!eventDueForReminder(event, now, hours, sentSet)) continue;
    const students = await prisma.student.findMany({
      where: {
        campusId,
        status: "ACTIVE",
        ...(event.classId
          ? { enrollments: { some: { classId: event.classId, isCurrent: true } } }
          : {}),
      },
      select: { id: true, mobile: true },
      take: 500,
    });
    const when = event.startsAt.toISOString().slice(0, 16).replace("T", " ");
    const body = `${campus?.name ?? "School"} event: ${event.title} on ${when}.`;
    for (const student of students) {
      const to = trim(student.mobile);
      if (!to) continue;
      await queueRendered({
        campusId,
        channel: "SMS",
        studentId: student.id,
        to,
        body,
      });
      queued += 1;
    }
    sent = recordEventReminder(sent, event.id);
    sentSet.add(event.id);
  }
  await writeSetting(campusId, EVENT_REMINDER_LOG_KEY, sent);
  return { queued, hours };
}

export async function saveRemindHours(campusId: string, hours: number) {
  const next = parseRemindHours(hours);
  await writeSetting(campusId, EVENT_REMIND_HOURS_KEY, next);
  return next;
}

export function messageTemplatePatchData(
  existing: {
    name: string;
    channel: string;
    subject: string | null;
    body: string;
  },
  patch: {
    name?: string;
    channel?: "EMAIL" | "SMS";
    subject?: string | null;
    body?: string;
  },
) {
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  const body = patch.body !== undefined ? trim(patch.body) : existing.body;
  const channel = patch.channel !== undefined ? patch.channel : existing.channel;
  if (!name) throw validationError({ name: "required" });
  if (!body) throw validationError({ body: "required" });
  if (channel !== "EMAIL" && channel !== "SMS") {
    throw validationError({ channel: "invalid" });
  }
  return {
    name,
    channel,
    body,
    ...(patch.subject !== undefined ? { subject: trim(patch.subject) || null } : {}),
  };
}

export async function getMessageTemplate(campusId: string, id: string) {
  const row = await prisma.messageTemplate.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("template");
  return row;
}

export async function patchMessageTemplate(
  campusId: string,
  id: string,
  patch: {
    name?: string;
    channel?: "EMAIL" | "SMS";
    subject?: string | null;
    body?: string;
  },
) {
  const existing = await getMessageTemplate(campusId, id);
  const data = messageTemplatePatchData(existing, patch);
  try {
    return await prisma.messageTemplate.update({
      where: { id: existing.id },
      data,
    });
  } catch (error) {
    if (prismaErrorCode(error) === "P2002") throw conflict("duplicate name");
    throw error;
  }
}

export async function removeMessageTemplate(campusId: string, id: string) {
  const existing = await getMessageTemplate(campusId, id);
  await prisma.messageTemplate.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

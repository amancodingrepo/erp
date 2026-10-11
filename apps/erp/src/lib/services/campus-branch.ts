import { Prisma, StudentStatus } from "@prisma/client";
import { parseDateOnly } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { enrollmentScope } from "@/lib/services/session-context";
import {
  STAFF_EXTRAS_KEY,
  parseStaffExtras,
} from "@/lib/services/hr-transport";

export const ELIGIBILITY_KEY = "academics.eligibility";
export const ONE_WAY_KEY = "comms.oneWayRoles";
export const LINKS_KEY = "campus.externalLinks";
export const PRINCIPALS_KEY = "academics.principals";
export const ATTENDANCE_MODES_KEY = "attendance.modes";
export const WEBSITE_KEY = "campus.website";

export type EligibilityRule = {
  id: string;
  classId: string;
  fromBirthDate: string;
  toBirthDate: string;
};

export type ExternalLink = { id: string; title: string; url: string };
export type PrincipalRow = {
  id: string;
  classId: string;
  staffId: string;
  signatureUrl: string;
};
export type AttendanceMode = { id: string; name: string };
export type BirthdayWhen = "past" | "today" | "upcoming";
export type CampusWebsite = {
  published: boolean;
  tagline: string;
  about: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function isoDate(value: unknown) {
  const raw = trim(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const parsed = parseDateOnly(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return raw;
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

function plainText(value: unknown) {
  return trim(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseWebsite(value: unknown): CampusWebsite {
  const rec =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    published: Boolean(rec.published),
    tagline: plainText(rec.tagline),
    about: plainText(rec.about),
    logoUrl: httpsUrl(rec.logoUrl),
    phone: trim(rec.phone),
    email: trim(rec.email),
    address: plainText(rec.address),
  };
}

export function upsertWebsite(
  previous: CampusWebsite,
  input: {
    published?: boolean;
    tagline?: string;
    about?: string;
    logoUrl?: string;
    phone?: string;
    email?: string;
    address?: string;
  },
): CampusWebsite {
  if (input.logoUrl !== undefined && trim(input.logoUrl) && !httpsUrl(input.logoUrl)) {
    throw validationError({ logoUrl: "https required" });
  }
  return {
    published: input.published ?? previous.published,
    tagline: input.tagline !== undefined ? plainText(input.tagline) : previous.tagline,
    about: input.about !== undefined ? plainText(input.about) : previous.about,
    logoUrl:
      input.logoUrl !== undefined
        ? httpsUrl(input.logoUrl)
        : previous.logoUrl,
    phone: input.phone !== undefined ? trim(input.phone) : previous.phone,
    email: input.email !== undefined ? trim(input.email) : previous.email,
    address:
      input.address !== undefined ? plainText(input.address) : previous.address,
  };
}

function monthDayUtc(value: Date) {
  return (value.getUTCMonth() + 1) * 100 + value.getUTCDate();
}

function dayDelta(dob: Date, today: Date) {
  const year = today.getUTCFullYear();
  const t = Date.UTC(year, today.getUTCMonth(), today.getUTCDate());
  const b = Date.UTC(year, dob.getUTCMonth(), dob.getUTCDate());
  const day = 86400000;
  let diff = Math.round((b - t) / day);
  if (diff > 182) diff -= 365;
  if (diff < -182) diff += 365;
  return diff;
}

export function birthdayWhen(
  dob: Date,
  today: Date,
  pastDays = 7,
  futureDays = 7,
): BirthdayWhen | null {
  if (Number.isNaN(dob.getTime()) || Number.isNaN(today.getTime())) return null;
  const diff = dayDelta(dob, today);
  if (diff === 0) return "today";
  if (diff < 0 && Math.abs(diff) <= pastDays) return "past";
  if (diff > 0 && diff <= futureDays) return "upcoming";
  return null;
}

export function parseEligibility(value: unknown): EligibilityRule[] {
  if (!Array.isArray(value)) return [];
  const out: EligibilityRule[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const classId = trim(rec.classId);
    const fromBirthDate = isoDate(rec.fromBirthDate);
    const toBirthDate = isoDate(rec.toBirthDate);
    if (!id || !classId || !fromBirthDate || !toBirthDate || seen.has(classId)) {
      continue;
    }
    seen.add(classId);
    out.push({ id, classId, fromBirthDate, toBirthDate });
  }
  return out;
}

export function upsertEligibility(
  rows: EligibilityRule[],
  input: { id?: string; classId: string; fromBirthDate: string; toBirthDate: string },
) {
  const classId = trim(input.classId);
  const fromBirthDate = isoDate(input.fromBirthDate);
  const toBirthDate = isoDate(input.toBirthDate);
  if (!classId) throw validationError({ classId: "required" });
  if (!fromBirthDate) throw validationError({ fromBirthDate: "invalid" });
  if (!toBirthDate) throw validationError({ toBirthDate: "invalid" });
  if (fromBirthDate > toBirthDate) {
    throw validationError({ toBirthDate: "must be on or after from date" });
  }
  const id = trim(input.id) || crypto.randomUUID();
  const next: EligibilityRule = { id, classId, fromBirthDate, toBirthDate };
  return [...rows.filter((row) => row.classId !== classId), next];
}

export function dropEligibility(rows: EligibilityRule[], id: string) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const next = rows.filter((row) => row.id !== key);
  if (next.length === rows.length) throw notFound("eligibility");
  return next;
}

export function patchEligibilityRow(
  rows: EligibilityRule[],
  id: string,
  patch: { classId?: string; fromBirthDate?: string; toBirthDate?: string },
) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const existing = rows.find((row) => row.id === key);
  if (!existing) throw notFound("eligibility");
  const classId = patch.classId !== undefined ? trim(patch.classId) : existing.classId;
  const fromBirthDate =
    patch.fromBirthDate !== undefined
      ? isoDate(patch.fromBirthDate)
      : existing.fromBirthDate;
  const toBirthDate =
    patch.toBirthDate !== undefined
      ? isoDate(patch.toBirthDate)
      : existing.toBirthDate;
  if (!classId) throw validationError({ classId: "required" });
  if (!fromBirthDate) throw validationError({ fromBirthDate: "invalid" });
  if (!toBirthDate) throw validationError({ toBirthDate: "invalid" });
  if (fromBirthDate > toBirthDate) {
    throw validationError({ toBirthDate: "must be on or after from date" });
  }
  const clash = rows.find((row) => row.id !== existing.id && row.classId === classId);
  if (clash) throw validationError({ classId: "already assigned" });
  const next: EligibilityRule = {
    id: existing.id,
    classId,
    fromBirthDate,
    toBirthDate,
  };
  return rows.map((row) => (row.id === existing.id ? next : row));
}

export function eligibilityAllows(dob: Date, rule: EligibilityRule) {
  if (Number.isNaN(dob.getTime())) return false;
  const stamp = dob.toISOString().slice(0, 10);
  return stamp >= rule.fromBirthDate && stamp <= rule.toBirthDate;
}

export function parseOneWayRoles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    const name = trim(row);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export function setOneWayRoles(roles: unknown) {
  return parseOneWayRoles(roles);
}

export function parentMayMessage(blocked: string[], recipientRoles: string[]) {
  const set = new Set(
    blocked.map((row) => row.trim().toLowerCase()).filter(Boolean),
  );
  if (!set.size) return true;
  return !recipientRoles.some((row) => set.has(row.trim().toLowerCase()));
}

export function parseExternalLinks(value: unknown): ExternalLink[] {
  if (!Array.isArray(value)) return [];
  const out: ExternalLink[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const title = trim(rec.title);
    const url = httpsUrl(rec.url);
    if (!id || !title || !url || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, title, url });
  }
  return out;
}

export function upsertExternalLink(
  rows: ExternalLink[],
  input: { id?: string; title: string; url: string },
) {
  const title = trim(input.title);
  const url = httpsUrl(input.url);
  if (!title) throw validationError({ title: "required" });
  if (!url) throw validationError({ url: "https required" });
  const id = trim(input.id) || crypto.randomUUID();
  const next: ExternalLink = { id, title, url };
  return [...rows.filter((row) => row.id !== id), next];
}

export function dropExternalLink(rows: ExternalLink[], id: string) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const next = rows.filter((row) => row.id !== key);
  if (next.length === rows.length) throw notFound("link");
  return next;
}

export function patchExternalLinkRow(
  rows: ExternalLink[],
  id: string,
  patch: { title?: string; url?: string },
) {
  const key = trim(id);
  const existing = rows.find((row) => row.id === key);
  if (!existing) throw notFound("link");
  const title = patch.title !== undefined ? trim(patch.title) : existing.title;
  const url = patch.url !== undefined ? httpsUrl(patch.url) : existing.url;
  if (!title) throw validationError({ title: "required" });
  if (patch.url !== undefined && !url) throw validationError({ url: "https required" });
  return upsertExternalLink(rows, { id: existing.id, title, url });
}

export function parsePrincipals(value: unknown): PrincipalRow[] {
  if (!Array.isArray(value)) return [];
  const out: PrincipalRow[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const classId = trim(rec.classId);
    const staffId = trim(rec.staffId);
    if (!id || !classId || !staffId || seen.has(classId)) continue;
    seen.add(classId);
    out.push({
      id,
      classId,
      staffId,
      signatureUrl: httpsUrl(rec.signatureUrl) || trim(rec.signatureUrl),
    });
  }
  return out;
}

export function upsertPrincipal(
  rows: PrincipalRow[],
  input: { id?: string; classId: string; staffId: string; signatureUrl?: string },
) {
  const classId = trim(input.classId);
  const staffId = trim(input.staffId);
  if (!classId) throw validationError({ classId: "required" });
  if (!staffId) throw validationError({ staffId: "required" });
  const signature = trim(input.signatureUrl);
  const signatureUrl = signature ? httpsUrl(signature) || signature : "";
  const previous = rows.find((row) => row.classId === classId);
  const id = trim(input.id) || previous?.id || crypto.randomUUID();
  const next: PrincipalRow = { id, classId, staffId, signatureUrl };
  return [...rows.filter((row) => row.classId !== classId), next];
}

export function parseAttendanceModes(value: unknown): AttendanceMode[] {
  if (!Array.isArray(value)) return [];
  const out: AttendanceMode[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const name = trim(rec.name);
    const key = name.toLowerCase();
    if (!id || !name || seen.has(key)) continue;
    seen.add(key);
    out.push({ id, name });
  }
  return out;
}

export function upsertAttendanceMode(
  rows: AttendanceMode[],
  input: { id?: string; name: string },
) {
  const name = trim(input.name);
  if (!name) throw validationError({ name: "required" });
  const existing = rows.find(
    (row) => row.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) return rows;
  const id = trim(input.id) || crypto.randomUUID();
  return [...rows, { id, name }];
}

export function dropAttendanceMode(rows: AttendanceMode[], id: string) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const next = rows.filter((row) => row.id !== key);
  if (next.length === rows.length) throw notFound("attendance mode");
  return next;
}

export function patchAttendanceModeRow(
  rows: AttendanceMode[],
  id: string,
  name: string,
) {
  const key = trim(id);
  const nextName = trim(name);
  if (!key) throw validationError({ id: "required" });
  if (!nextName) throw validationError({ name: "required" });
  const existing = rows.find((row) => row.id === key);
  if (!existing) throw notFound("attendance mode");
  const clash = rows.find(
    (row) =>
      row.id !== existing.id && row.name.toLowerCase() === nextName.toLowerCase(),
  );
  if (clash) throw validationError({ name: "already exists" });
  return rows.map((row) =>
    row.id === existing.id ? { id: existing.id, name: nextName } : row,
  );
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

export async function listEligibility(campusId: string) {
  return parseEligibility(await readSetting(campusId, ELIGIBILITY_KEY));
}

export async function saveEligibility(
  campusId: string,
  input: { id?: string; classId: string; fromBirthDate: string; toBirthDate: string },
) {
  const klass = await prisma.class.findFirst({
    where: { id: input.classId, program: { department: { campusId } } },
    select: { id: true },
  });
  if (!klass) throw notFound("class");
  const next = upsertEligibility(await listEligibility(campusId), {
    ...input,
    classId: klass.id,
  });
  await writeSetting(campusId, ELIGIBILITY_KEY, next);
  return next.find((row) => row.classId === klass.id)!;
}

export async function getEligibility(campusId: string, id: string) {
  const row = (await listEligibility(campusId)).find((entry) => entry.id === trim(id));
  if (!row) throw notFound("eligibility");
  return row;
}

export async function patchEligibility(
  campusId: string,
  id: string,
  patch: { classId?: string; fromBirthDate?: string; toBirthDate?: string },
) {
  const rows = await listEligibility(campusId);
  const existing = rows.find((row) => row.id === trim(id));
  if (!existing) throw notFound("eligibility");
  const classId = patch.classId !== undefined ? trim(patch.classId) : existing.classId;
  const klass = await prisma.class.findFirst({
    where: { id: classId, program: { department: { campusId } } },
    select: { id: true },
  });
  if (!klass) throw notFound("class");
  const next = patchEligibilityRow(rows, existing.id, { ...patch, classId: klass.id });
  await writeSetting(campusId, ELIGIBILITY_KEY, next);
  return next.find((row) => row.id === existing.id)!;
}

export async function removeEligibility(campusId: string, id: string) {
  const next = dropEligibility(await listEligibility(campusId), id);
  await writeSetting(campusId, ELIGIBILITY_KEY, next);
  return { id: trim(id), deleted: true };
}

export async function listOneWayRoles(campusId: string) {
  return parseOneWayRoles(await readSetting(campusId, ONE_WAY_KEY));
}

export async function saveOneWayRoles(campusId: string, roles: unknown) {
  const next = setOneWayRoles(roles);
  await writeSetting(campusId, ONE_WAY_KEY, next);
  return next;
}

export async function campusRoleNames(campusId: string) {
  const roles = await prisma.role.findMany({
    where: { OR: [{ campusId }, { campusId: null }] },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return roles.map((row) => row.name);
}

export async function listExternalLinks(campusId: string) {
  return parseExternalLinks(await readSetting(campusId, LINKS_KEY));
}

export async function saveExternalLink(
  campusId: string,
  input: { id?: string; title: string; url: string },
) {
  const next = upsertExternalLink(await listExternalLinks(campusId), input);
  await writeSetting(campusId, LINKS_KEY, next);
  return next.find((row) => row.title === trim(input.title))!;
}

export async function getExternalLink(campusId: string, id: string) {
  const row = (await listExternalLinks(campusId)).find((item) => item.id === trim(id));
  if (!row) throw notFound("link");
  return row;
}

export async function patchExternalLink(
  campusId: string,
  id: string,
  patch: { title?: string; url?: string },
) {
  const next = patchExternalLinkRow(await listExternalLinks(campusId), id, patch);
  await writeSetting(campusId, LINKS_KEY, next);
  return next.find((row) => row.id === trim(id))!;
}

export async function removeExternalLink(campusId: string, id: string) {
  const existing = await getExternalLink(campusId, id);
  await writeSetting(
    campusId,
    LINKS_KEY,
    dropExternalLink(await listExternalLinks(campusId), existing.id),
  );
  return { id: existing.id, deleted: true };
}

export async function getWebsite(campusId: string) {
  return parseWebsite(await readSetting(campusId, WEBSITE_KEY));
}

export async function saveWebsite(
  campusId: string,
  input: Parameters<typeof upsertWebsite>[1],
) {
  const next = upsertWebsite(await getWebsite(campusId), input);
  await writeSetting(campusId, WEBSITE_KEY, next);
  return next;
}

export async function publicCampusWebsite(code: string) {
  const { normalizeCampusCode } = await import("@/lib/services/tenants");
  const campus = await prisma.campus.findFirst({
    where: { code: normalizeCampusCode(code) },
    select: { id: true, name: true, code: true },
  });
  if (!campus) throw notFound("campus");
  const site = await getWebsite(campus.id);
  if (!site.published) throw notFound("website");
  return {
    campus: { name: campus.name, code: campus.code },
    ...site,
    links: await listExternalLinks(campus.id),
  };
}

export async function listPrincipals(campusId: string) {
  return parsePrincipals(await readSetting(campusId, PRINCIPALS_KEY));
}

export async function replacePrincipals(
  campusId: string,
  rows: Array<{ id?: string; classId: string; staffId: string; signatureUrl?: string }>,
) {
  let next: PrincipalRow[] = [];
  for (const row of rows) {
    const [klass, staff] = await Promise.all([
      prisma.class.findFirst({
        where: { id: row.classId, program: { department: { campusId } } },
        select: { id: true },
      }),
      prisma.staff.findFirst({
        where: { id: row.staffId, campusId },
        select: { id: true },
      }),
    ]);
    if (!klass) throw notFound("class");
    if (!staff) throw notFound("staff");
    next = upsertPrincipal(next, {
      ...row,
      classId: klass.id,
      staffId: staff.id,
    });
  }
  await writeSetting(campusId, PRINCIPALS_KEY, next);
  return next;
}

export async function savePrincipal(
  campusId: string,
  input: { id?: string; classId: string; staffId: string; signatureUrl?: string },
) {
  const [klass, staff] = await Promise.all([
    prisma.class.findFirst({
      where: { id: input.classId, program: { department: { campusId } } },
      select: { id: true },
    }),
    prisma.staff.findFirst({
      where: { id: input.staffId, campusId },
      select: { id: true },
    }),
  ]);
  if (!klass) throw notFound("class");
  if (!staff) throw notFound("staff");
  const next = upsertPrincipal(await listPrincipals(campusId), {
    ...input,
    classId: klass.id,
    staffId: staff.id,
  });
  await writeSetting(campusId, PRINCIPALS_KEY, next);
  return next.find((row) => row.classId === klass.id)!;
}

export async function listAttendanceModes(campusId: string) {
  return parseAttendanceModes(await readSetting(campusId, ATTENDANCE_MODES_KEY));
}

export async function saveAttendanceMode(
  campusId: string,
  input: { id?: string; name: string },
) {
  const next = upsertAttendanceMode(await listAttendanceModes(campusId), input);
  await writeSetting(campusId, ATTENDANCE_MODES_KEY, next);
  return next.find((row) => row.name.toLowerCase() === trim(input.name).toLowerCase())!;
}

export async function getAttendanceMode(campusId: string, id: string) {
  const row = (await listAttendanceModes(campusId)).find(
    (entry) => entry.id === trim(id),
  );
  if (!row) throw notFound("attendance mode");
  return row;
}

export async function patchAttendanceMode(campusId: string, id: string, name: string) {
  const next = patchAttendanceModeRow(await listAttendanceModes(campusId), id, name);
  await writeSetting(campusId, ATTENDANCE_MODES_KEY, next);
  return next.find((row) => row.id === trim(id))!;
}

export async function removeAttendanceMode(campusId: string, id: string) {
  const next = dropAttendanceMode(await listAttendanceModes(campusId), id);
  await writeSetting(campusId, ATTENDANCE_MODES_KEY, next);
  return { id: trim(id), deleted: true };
}

export async function listBirthdays(
  campusId: string,
  sessionId: string | null,
  today = new Date(),
  pastDays = 7,
  futureDays = 7,
) {
  const [students, staff, extrasValue] = await Promise.all([
    prisma.student.findMany({
      where: {
        campusId,
        status: StudentStatus.ACTIVE,
        dob: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNo: true,
        dob: true,
        enrollments: {
          where: enrollmentScope(sessionId),
          select: { class: { select: { name: true } } },
          take: 1,
        },
      },
    }),
    prisma.staff.findMany({
      where: { campusId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    }),
    readSetting(campusId, STAFF_EXTRAS_KEY),
  ]);
  const extras = parseStaffExtras(extrasValue);
  const extraById = new Map(extras.map((row) => [row.staffId, row]));
  const out: Array<{
    kind: "student" | "staff";
    id: string;
    name: string;
    dob: string;
    when: BirthdayWhen;
    className: string;
  }> = [];
  for (const row of students) {
    if (!row.dob) continue;
    const when = birthdayWhen(row.dob, today, pastDays, futureDays);
    if (!when) continue;
    out.push({
      kind: "student",
      id: row.id,
      name: [row.firstName, row.lastName].filter(Boolean).join(" "),
      dob: row.dob.toISOString().slice(0, 10),
      when,
      className: row.enrollments[0]?.class.name ?? "",
    });
  }
  for (const row of staff) {
    const dobRaw = extraById.get(row.id)?.dob;
    if (!dobRaw) continue;
    const dob = parseDateOnly(dobRaw);
    const when = birthdayWhen(dob, today, pastDays, futureDays);
    if (!when) continue;
    out.push({
      kind: "staff",
      id: row.id,
      name: [row.firstName, row.lastName].filter(Boolean).join(" "),
      dob: dobRaw,
      when,
      className: "",
    });
  }
  const order: Record<BirthdayWhen, number> = { today: 0, upcoming: 1, past: 2 };
  return out.sort((a, b) => {
    const byWhen = order[a.when] - order[b.when];
    if (byWhen) return byWhen;
    return monthDayUtc(parseDateOnly(a.dob)) - monthDayUtc(parseDateOnly(b.dob));
  });
}

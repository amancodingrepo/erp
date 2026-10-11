import { Prisma } from "@prisma/client";
import { classInCampus, parseDateOnly } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";

export const ADMISSION_TESTS_KEY = "admission.tests";
export const ADMISSION_TEST_SITS_KEY = "admission.testSits";

export type AdmissionTest = {
  id: string;
  name: string;
  date: string;
  classId: string;
  venue: string;
};

export type AdmissionTestSit = {
  id: string;
  testId: string;
  applicationId: string;
  score: number | null;
  appeared: boolean;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function plainText(value: unknown) {
  return trim(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isoDate(value: unknown) {
  const raw = trim(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const parsed = parseDateOnly(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return raw;
}

function scoreOf(value: unknown) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
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

export function parseAdmissionTests(value: unknown): AdmissionTest[] {
  if (!Array.isArray(value)) return [];
  const out: AdmissionTest[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const name = trim(rec.name);
    const date = isoDate(rec.date);
    const key = name.toLowerCase();
    if (!name || !date || seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: trim(rec.id) || crypto.randomUUID(),
      name,
      date,
      classId: trim(rec.classId),
      venue: plainText(rec.venue),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

export function upsertAdmissionTest(
  rows: AdmissionTest[],
  input: { id?: string; name: string; date: string; classId?: string; venue?: string },
) {
  const name = trim(input.name);
  const date = isoDate(input.date);
  if (!name) throw validationError({ name: "required" });
  if (!date) throw validationError({ date: "YYYY-MM-DD" });
  const id =
    trim(input.id) ||
    rows.find((row) => row.name.toLowerCase() === name.toLowerCase())?.id ||
    crypto.randomUUID();
  const next: AdmissionTest = {
    id,
    name,
    date,
    classId: trim(input.classId),
    venue: plainText(input.venue),
  };
  return parseAdmissionTests([
    ...rows.filter(
      (row) => row.id !== id && row.name.toLowerCase() !== name.toLowerCase(),
    ),
    next,
  ]);
}

export function dropAdmissionTest(rows: AdmissionTest[], id: string) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const next = rows.filter((row) => row.id !== key);
  if (next.length === rows.length) throw notFound("admission test");
  return next;
}

export function assertAdmissionTestDroppable(sits: AdmissionTestSit[], testId: string) {
  const key = trim(testId);
  if (sits.some((row) => row.testId === key)) {
    throw conflict("admission test has sits");
  }
}

export function patchAdmissionTestRow(
  rows: AdmissionTest[],
  id: string,
  patch: { name?: string; date?: string; classId?: string; venue?: string },
) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const existing = rows.find((row) => row.id === key);
  if (!existing) throw notFound("admission test");
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  const date = patch.date !== undefined ? isoDate(patch.date) : existing.date;
  if (!name) throw validationError({ name: "required" });
  if (!date) throw validationError({ date: "YYYY-MM-DD" });
  const clash = rows.find(
    (row) =>
      row.id !== existing.id && row.name.toLowerCase() === name.toLowerCase(),
  );
  if (clash) throw validationError({ name: "already exists" });
  const next: AdmissionTest = {
    id: existing.id,
    name,
    date,
    classId: patch.classId !== undefined ? trim(patch.classId) : existing.classId,
    venue: patch.venue !== undefined ? plainText(patch.venue) : existing.venue,
  };
  return parseAdmissionTests(
    rows.map((row) => (row.id === existing.id ? next : row)),
  );
}

export function parseAdmissionTestSits(value: unknown): AdmissionTestSit[] {
  if (!Array.isArray(value)) return [];
  const out: AdmissionTestSit[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const testId = trim(rec.testId);
    const applicationId = trim(rec.applicationId);
    const key = `${testId}\0${applicationId}`;
    if (!testId || !applicationId || seen.has(key)) continue;
    seen.add(key);
    const score = scoreOf(rec.score);
    const appeared =
      rec.appeared == null ? score != null : Boolean(rec.appeared);
    out.push({
      id: trim(rec.id) || crypto.randomUUID(),
      testId,
      applicationId,
      score,
      appeared,
    });
  }
  return out;
}

export function upsertAdmissionTestSit(
  rows: AdmissionTestSit[],
  input: {
    id?: string;
    testId: string;
    applicationId: string;
    score?: number | string | null;
    appeared?: boolean;
  },
) {
  const testId = trim(input.testId);
  const applicationId = trim(input.applicationId);
  if (!testId) throw validationError({ testId: "required" });
  if (!applicationId) throw validationError({ applicationId: "required" });
  const score = scoreOf(input.score);
  const appeared = input.appeared == null ? score != null : Boolean(input.appeared);
  if (appeared && (score == null || score < 0)) {
    throw validationError({ score: "must be zero or more" });
  }
  if (score != null && score < 0) throw validationError({ score: "must be zero or more" });
  const previous = rows.find(
    (row) => row.testId === testId && row.applicationId === applicationId,
  );
  const next: AdmissionTestSit = {
    id: trim(input.id) || previous?.id || crypto.randomUUID(),
    testId,
    applicationId,
    score,
    appeared,
  };
  return [
    ...rows.filter(
      (row) => !(row.testId === testId && row.applicationId === applicationId),
    ),
    next,
  ];
}

export function attachAdmissionTests(
  tests: AdmissionTest[],
  sits: AdmissionTestSit[],
  classes: Array<{ id: string; name: string }>,
) {
  const names = new Map(classes.map((row) => [row.id, row.name]));
  const counts = new Map<string, number>();
  for (const sit of sits) {
    counts.set(sit.testId, (counts.get(sit.testId) ?? 0) + 1);
  }
  return tests.map((row) => ({
    ...row,
    className: names.get(row.classId) ?? "",
    sitCount: counts.get(row.id) ?? 0,
  }));
}

export function admissionTestReportRows(
  tests: AdmissionTest[],
  sits: AdmissionTestSit[],
  applications: Array<{
    id: string;
    applicationNo: string;
    firstName: string;
    lastName?: string | null;
  }>,
) {
  const byTest = new Map(tests.map((row) => [row.id, row]));
  const byApp = new Map(applications.map((row) => [row.id, row]));
  return sits
    .map((sit) => {
      const test = byTest.get(sit.testId);
      const app = byApp.get(sit.applicationId);
      if (!test || !app) return null;
      return {
        test: test.name,
        date: test.date,
        applicationNo: app.applicationNo,
        name: [app.firstName, app.lastName].filter(Boolean).join(" "),
        score: sit.score,
        appeared: sit.appeared ? "yes" : "no",
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) =>
      `${a.date} ${a.test} ${a.applicationNo}`.localeCompare(
        `${b.date} ${b.test} ${b.applicationNo}`,
      ),
    );
}

export async function listAdmissionTests(campusId: string) {
  const [tests, sits] = await Promise.all([
    parseAdmissionTests(await readSetting(campusId, ADMISSION_TESTS_KEY)),
    parseAdmissionTestSits(await readSetting(campusId, ADMISSION_TEST_SITS_KEY)),
  ]);
  const classIds = [...new Set(tests.map((row) => row.classId).filter(Boolean))];
  const classes = classIds.length
    ? await prisma.class.findMany({
        where: { id: { in: classIds }, program: { department: { campusId } } },
        select: { id: true, name: true },
      })
    : [];
  return attachAdmissionTests(tests, sits, classes);
}

export async function listAdmissionTestSits(campusId: string) {
  return parseAdmissionTestSits(await readSetting(campusId, ADMISSION_TEST_SITS_KEY));
}

export async function getAdmissionTest(campusId: string, id: string) {
  const row = (await listAdmissionTests(campusId)).find((entry) => entry.id === trim(id));
  if (!row) throw notFound("admission test");
  return row;
}

export async function patchAdmissionTest(
  campusId: string,
  id: string,
  patch: { name?: string; date?: string; classId?: string; venue?: string },
) {
  const classId = patch.classId !== undefined ? trim(patch.classId) : "";
  const klass = classId ? await classInCampus(campusId, classId) : null;
  const rows = parseAdmissionTests(await readSetting(campusId, ADMISSION_TESTS_KEY));
  const next = patchAdmissionTestRow(rows, id, {
    ...patch,
    classId: patch.classId !== undefined ? classId : undefined,
  });
  await writeSetting(campusId, ADMISSION_TESTS_KEY, next);
  const saved = next.find((row) => row.id === trim(id));
  if (!saved) throw notFound("admission test");
  const sits = await listAdmissionTestSits(campusId);
  return attachAdmissionTests(
    [saved],
    sits,
    klass ? [{ id: klass.id, name: klass.name }] : [],
  )[0];
}

export async function removeAdmissionTest(campusId: string, id: string) {
  const rows = parseAdmissionTests(await readSetting(campusId, ADMISSION_TESTS_KEY));
  const existing = rows.find((row) => row.id === trim(id));
  if (!existing) throw notFound("admission test");
  assertAdmissionTestDroppable(await listAdmissionTestSits(campusId), existing.id);
  const next = dropAdmissionTest(rows, existing.id);
  await writeSetting(campusId, ADMISSION_TESTS_KEY, next);
  return { id: existing.id, deleted: true };
}

export async function saveAdmissionTest(
  campusId: string,
  input: { id?: string; name: string; date: string; classId?: string; venue?: string },
) {
  const classId = trim(input.classId);
  const klass = classId ? await classInCampus(campusId, classId) : null;
  const rows = parseAdmissionTests(await readSetting(campusId, ADMISSION_TESTS_KEY));
  const next = upsertAdmissionTest(rows, { ...input, classId });
  await writeSetting(campusId, ADMISSION_TESTS_KEY, next);
  const saved =
    next.find((row) => row.name.toLowerCase() === trim(input.name).toLowerCase()) ??
    next.find((row) => row.id === trim(input.id)) ??
    next[next.length - 1]!;
  const sits = await listAdmissionTestSits(campusId);
  return attachAdmissionTests(
    [saved],
    sits,
    klass ? [{ id: klass.id, name: klass.name }] : [],
  )[0];
}

export async function recordAdmissionTestSit(
  campusId: string,
  input: {
    testId: string;
    applicationId: string;
    score?: number | string | null;
    appeared?: boolean;
  },
) {
  const tests = parseAdmissionTests(await readSetting(campusId, ADMISSION_TESTS_KEY));
  const test = tests.find((row) => row.id === trim(input.testId));
  if (!test) throw notFound("admission test");
  const application = await prisma.application.findFirst({
    where: { id: trim(input.applicationId), campusId },
  });
  if (!application) throw notFound("application");
  const next = upsertAdmissionTestSit(await listAdmissionTestSits(campusId), {
    ...input,
    testId: test.id,
    applicationId: application.id,
  });
  await writeSetting(campusId, ADMISSION_TEST_SITS_KEY, next);
  const sit = next.find(
    (row) => row.testId === test.id && row.applicationId === application.id,
  )!;
  if (sit.appeared && sit.score != null) {
    await prisma.application.update({
      where: { id: application.id },
      data: { score: sit.score },
    });
  }
  return sit;
}

export async function admissionTestReportGrain(campusId: string) {
  const [tests, sits] = await Promise.all([
    parseAdmissionTests(await readSetting(campusId, ADMISSION_TESTS_KEY)),
    listAdmissionTestSits(campusId),
  ]);
  const ids = [...new Set(sits.map((row) => row.applicationId))];
  const applications = ids.length
    ? await prisma.application.findMany({
        where: { campusId, id: { in: ids } },
        select: {
          id: true,
          applicationNo: true,
          firstName: true,
          lastName: true,
        },
      })
    : [];
  return admissionTestReportRows(tests, sits, applications);
}

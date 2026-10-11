import { Gender, Prisma, StudentStatus } from "@prisma/client";
import { parseDateOnly } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { enrollmentScope } from "@/lib/services/session-context";

export function containsMatch(
  value: string | null | undefined,
  q: string,
  exact: boolean,
) {
  if (!value) return false;
  const hay = value.trim().toLowerCase();
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  return exact ? hay === needle : hay.includes(needle);
}

export type StudentSearchInput = {
  q?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  id?: string;
  exact?: boolean;
};

export function studentMatchesSearch(
  student: {
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
    mobile?: string | null;
    phone?: string | null;
    email?: string | null;
    admissionNo: string;
    enrollmentNo?: string | null;
    scholarNo?: string | null;
    pen?: string | null;
    apaarId?: string | null;
  },
  input: StudentSearchInput,
) {
  const exact = Boolean(input.exact);
  const checks: Array<[string | undefined, Array<string | null | undefined>]> = [
    [input.firstName, [student.firstName, student.middleName]],
    [input.lastName, [student.lastName]],
    [input.phone, [student.mobile, student.phone]],
    [input.email, [student.email]],
    [
      input.id,
      [
        student.admissionNo,
        student.enrollmentNo,
        student.scholarNo,
        student.pen,
        student.apaarId,
      ],
    ],
  ];
  let any = false;
  for (const [needle, fields] of checks) {
    if (!needle?.trim()) continue;
    any = true;
    if (!fields.some((field) => containsMatch(field, needle, exact))) return false;
  }
  if (input.q?.trim()) {
    any = true;
    const fields = [
      student.firstName,
      student.middleName,
      student.lastName,
      student.mobile,
      student.phone,
      student.email,
      student.admissionNo,
      student.enrollmentNo,
      student.scholarNo,
      student.pen,
      student.apaarId,
    ];
    if (!fields.some((field) => containsMatch(field, input.q!, exact))) return false;
  }
  return any;
}

export function attendanceKpis(
  rows: Array<{ status: string }>,
  enrolled?: number,
) {
  const byStatus: Record<string, number> = {};
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  }
  const marked = rows.length;
  const present = byStatus.PRESENT ?? 0;
  const notTaken =
    enrolled == null ? 0 : Math.max(0, enrolled - marked);
  return {
    marked,
    present,
    byStatus,
    percent: marked ? Math.round((present / marked) * 100) : 0,
    enrolled: enrolled ?? marked,
    notTaken,
  };
}

export const BROADCAST_KEY = "comms.broadcastLists";

export type BroadcastList = {
  id: string;
  name: string;
  studentIds: string[];
  staffIds: string[];
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function parseBroadcastLists(value: unknown): BroadcastList[] {
  if (!Array.isArray(value)) return [];
  const out: BroadcastList[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const name = trim(rec.name);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const studentIds = Array.isArray(rec.studentIds)
      ? rec.studentIds.map(trim).filter(Boolean)
      : [];
    const staffIds = Array.isArray(rec.staffIds)
      ? rec.staffIds.map(trim).filter(Boolean)
      : [];
    out.push({ id, name, studentIds, staffIds });
  }
  return out;
}

export function upsertBroadcastList(
  rows: BroadcastList[],
  input: {
    id?: string;
    name: string;
    studentIds?: unknown;
    staffIds?: unknown;
  },
) {
  const name = trim(input.name);
  if (!name) throw validationError({ name: "required" });
  const studentIds = Array.isArray(input.studentIds)
    ? [...new Set(input.studentIds.map(trim).filter(Boolean))]
    : [];
  const staffIds = Array.isArray(input.staffIds)
    ? [...new Set(input.staffIds.map(trim).filter(Boolean))]
    : [];
  if (!studentIds.length && !staffIds.length) {
    throw validationError({ members: "required" });
  }
  const id = trim(input.id) || crypto.randomUUID();
  const next: BroadcastList = { id, name, studentIds, staffIds };
  return [...rows.filter((row) => row.id !== id), next];
}

export function dropBroadcastList(rows: BroadcastList[], id: string) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const next = rows.filter((row) => row.id !== key);
  if (next.length === rows.length) throw notFound("broadcast list");
  return next;
}

export function contactAudiences(
  classes: Array<{ id: string; name: string }>,
  lists: BroadcastList[] = [],
) {
  return [
    { id: "all", label: "All contacts" },
    { id: "staff", label: "Staff" },
    { id: "students", label: "Students" },
    { id: "guardians", label: "Guardians" },
    ...classes.map((klass) => ({ id: `class:${klass.id}`, label: klass.name })),
    ...lists.map((list) => ({ id: `list:${list.id}`, label: list.name })),
  ];
}

function textFilter(value: string | undefined, exact: boolean) {
  if (!value?.trim()) return undefined;
  const term = value.trim();
  return exact
    ? { equals: term, mode: "insensitive" as const }
    : { contains: term, mode: "insensitive" as const };
}

export async function searchPeople(
  campusId: string,
  input: StudentSearchInput & { toFees?: boolean },
) {
  const exact = Boolean(input.exact);
  const q = input.q?.trim();
  if (
    (q && q.length < 2 && !input.firstName && !input.lastName && !input.phone && !input.email && !input.id) ||
    (!q && !input.firstName && !input.lastName && !input.phone && !input.email && !input.id)
  ) {
    return { students: [] as Array<Record<string, string>> };
  }
  const and = [
    ...(q
      ? [
          {
            OR: [
              { firstName: textFilter(q, exact) },
              { lastName: textFilter(q, exact) },
              { middleName: textFilter(q, exact) },
              { mobile: textFilter(q, exact) },
              { phone: textFilter(q, exact) },
              { email: textFilter(q, exact) },
              { admissionNo: textFilter(q, exact) },
              { enrollmentNo: textFilter(q, exact) },
              { scholarNo: textFilter(q, exact) },
              { pen: textFilter(q, exact) },
              { apaarId: textFilter(q, exact) },
            ].filter((clause) => Object.values(clause)[0]),
          },
        ]
      : []),
    ...(input.firstName ? [{ firstName: textFilter(input.firstName, exact) }] : []),
    ...(input.lastName ? [{ lastName: textFilter(input.lastName, exact) }] : []),
    ...(input.phone
      ? [{ OR: [{ mobile: textFilter(input.phone, exact) }, { phone: textFilter(input.phone, exact) }] }]
      : []),
    ...(input.email ? [{ email: textFilter(input.email, exact) }] : []),
    ...(input.id
      ? [
          {
            OR: [
              { admissionNo: textFilter(input.id, exact) },
              { enrollmentNo: textFilter(input.id, exact) },
              { scholarNo: textFilter(input.id, exact) },
              { pen: textFilter(input.id, exact) },
              { apaarId: textFilter(input.id, exact) },
            ].filter((clause) => Object.values(clause)[0]),
          },
        ]
      : []),
  ];
  const students = await prisma.student.findMany({
    where: { campusId, AND: and },
    take: 40,
    orderBy: { lastName: "asc" },
  });
  return {
    students: students.map((student) => {
      const profile = `/staff/students/${student.id}`;
      return {
        id: student.id,
        admissionNo: student.admissionNo,
        name: [student.firstName, student.lastName].filter(Boolean).join(" "),
        href: input.toFees ? `${profile}?tab=fees` : profile,
        feesHref: `${profile}?tab=fees`,
      };
    }),
  };
}

export async function listContacts(
  campusId: string,
  input: { audience?: string; gender?: string; q?: string; sessionId?: string | null },
) {
  const [classes, lists] = await Promise.all([
    prisma.class.findMany({
      where: { program: { department: { campusId } }, isActive: true },
      orderBy: { sequenceNo: "asc" },
      select: { id: true, name: true },
    }),
    listBroadcastLists(campusId),
  ]);
  const audiences = contactAudiences(classes, lists);
  const audience = input.audience || "all";
  const listId = audience.startsWith("list:") ? audience.slice(5) : "";
  const saved = listId ? lists.find((row) => row.id === listId) : undefined;
  const q = input.q?.trim().toLowerCase();
  const gender =
    input.gender && (Object.values(Gender) as string[]).includes(input.gender)
      ? (input.gender as Gender)
      : undefined;
  const people: Array<{
    kind: string;
    name: string;
    designation: string;
    email: string | null;
    phone: string | null;
    studentId?: string;
    staffId?: string;
    feesHref?: string;
  }> = [];

  const wantStaff =
    audience === "all" ||
    audience === "staff" ||
    Boolean(saved?.staffIds.length);
  const wantStudents =
    audience === "all" ||
    audience === "students" ||
    audience.startsWith("class:") ||
    Boolean(saved?.studentIds.length);
  const wantGuardians = audience === "all" || audience === "guardians";
  const classId = audience.startsWith("class:") ? audience.slice(6) : undefined;

  if (wantStaff) {
    const staff = await prisma.staff.findMany({
      where: {
        campusId,
        isActive: true,
        ...(gender ? { gender } : {}),
      },
      include: { designation: true },
      orderBy: { firstName: "asc" },
      take: 300,
    });
    for (const row of staff) {
      people.push({
        kind: "staff",
        name: [row.firstName, row.lastName].filter(Boolean).join(" "),
        designation: row.designation?.name ?? row.employeeId,
        email: row.email,
        phone: row.phone,
        staffId: row.id,
      });
    }
  }

  if (wantStudents) {
    const students = await prisma.student.findMany({
      where: {
        campusId,
        status: StudentStatus.ACTIVE,
        ...(gender ? { gender } : {}),
        ...(classId
          ? {
              enrollments: {
                some: { ...enrollmentScope(input.sessionId), classId },
              },
            }
          : {}),
      },
      include: {
        enrollments: {
          where: enrollmentScope(input.sessionId),
          include: { class: true, section: true },
          take: 1,
        },
      },
      take: 400,
      orderBy: { lastName: "asc" },
    });
    for (const student of students) {
      const klass = student.enrollments[0];
      people.push({
        kind: "student",
        name: [student.firstName, student.lastName].filter(Boolean).join(" "),
        designation: klass
          ? `${klass.class.name} / ${klass.section.name}`
          : student.admissionNo,
        email: student.email,
        phone: student.mobile ?? student.phone,
        studentId: student.id,
        feesHref: `/staff/students/${student.id}?tab=fees`,
      });
    }
  }

  if (wantGuardians) {
    const links = await prisma.studentGuardian.findMany({
      where: {
        student: {
          campusId,
          status: StudentStatus.ACTIVE,
          ...(classId
            ? { enrollments: { some: { ...enrollmentScope(input.sessionId), classId } } }
            : {}),
        },
      },
      include: { guardian: true, student: { select: { firstName: true, lastName: true } } },
      take: 400,
    });
    for (const link of links) {
      people.push({
        kind: "guardian",
        name: link.guardian.name,
        designation: `${link.relation} · ${[link.student.firstName, link.student.lastName].filter(Boolean).join(" ")}`,
        email: link.guardian.email,
        phone: link.guardian.phone,
      });
    }
  }

  const listed = saved
    ? people.filter(
        (person) =>
          (person.studentId && saved.studentIds.includes(person.studentId)) ||
          (person.staffId && saved.staffIds.includes(person.staffId)),
      )
    : people;
  const filtered = q
    ? listed.filter((person) =>
        [person.name, person.designation, person.email, person.phone].some((field) =>
          containsMatch(field, q, false),
        ),
      )
    : listed;

  return { audiences, people: filtered, lists };
}

async function readBroadcastSetting(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: BROADCAST_KEY } },
  });
  return parseBroadcastLists(row?.value);
}

export async function listBroadcastLists(campusId: string) {
  return readBroadcastSetting(campusId);
}

export async function saveBroadcastList(
  campusId: string,
  input: {
    id?: string;
    name: string;
    studentIds?: unknown;
    staffIds?: unknown;
  },
) {
  const next = upsertBroadcastList(await readBroadcastSetting(campusId), input);
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: BROADCAST_KEY } },
    update: { value: next as Prisma.InputJsonValue },
    create: { campusId, key: BROADCAST_KEY, value: next as Prisma.InputJsonValue },
  });
  return next.find((row) => row.name === trim(input.name)) ?? next[next.length - 1]!;
}

export async function getBroadcastList(campusId: string, id: string) {
  const row = (await readBroadcastSetting(campusId)).find((entry) => entry.id === trim(id));
  if (!row) throw notFound("broadcast list");
  return row;
}

export async function removeBroadcastList(campusId: string, id: string) {
  const next = dropBroadcastList(await readBroadcastSetting(campusId), id);
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: BROADCAST_KEY } },
    update: { value: next as Prisma.InputJsonValue },
    create: { campusId, key: BROADCAST_KEY, value: next as Prisma.InputJsonValue },
  });
  return { id: trim(id), deleted: true };
}

export async function attendanceDashboard(
  campusId: string,
  dateRaw?: string,
  sessionId?: string | null,
) {
  const date = dateRaw ? parseDateOnly(dateRaw) : parseDateOnly(new Date().toISOString().slice(0, 10));
  const [rows, enrolled] = await Promise.all([
    prisma.studentAttendance.findMany({
      where: {
        date,
        subjectId: "",
        student: { campusId },
      },
      select: { status: true },
    }),
    prisma.studentEnrollment.count({
      where: {
        ...enrollmentScope(sessionId),
        student: { campusId, status: StudentStatus.ACTIVE },
      },
    }),
  ]);
  return {
    date: date.toISOString().slice(0, 10),
    ...attendanceKpis(rows, enrolled),
  };
}

export async function daycareRoster(campusId: string) {
  const rows = await prisma.studentDaycare.findMany({
    where: { enrolled: true, student: { campusId } },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, admissionNo: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => ({
    studentId: row.student.id,
    admissionNo: row.student.admissionNo,
    name: [row.student.firstName, row.student.lastName].filter(Boolean).join(" "),
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    allowCctv: row.allowCctv,
    lastCheckInAt: row.lastCheckInAt,
    lastCheckOutAt: row.lastCheckOutAt,
  }));
}

import { StudentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { conflict, notFound } from "./errors";

const studentStatus = z.enum(["ACTIVE", "DISABLED", "ALUMNI", "TRANSFERRED"]);

export const orgFixtureSchema = z.object({
  kind: z.literal("org"),
  version: z.literal(1),
  organization: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    code: z.string().min(1),
  }),
  campuses: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    code: z.string().nullable(),
    timezone: z.string().min(1),
    dateFormat: z.string().min(1),
    currencyCode: z.string().min(1),
    currentSessionId: z.string().nullable(),
  })),
  sessions: z.array(z.object({
    id: z.string().min(1),
    campusId: z.string().min(1),
    name: z.string().min(1),
    code: z.string().nullable(),
    sequenceNo: z.number().int(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    isCurrent: z.boolean(),
    isActive: z.boolean(),
  })),
  students: z.array(z.object({
    id: z.string().min(1),
    campusId: z.string().min(1),
    admissionNo: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().nullable(),
    status: studentStatus,
  })),
});

export type OrgFixture = z.infer<typeof orgFixtureSchema>;

function day(value: Date | null) {
  return value ? value.toISOString() : null;
}

export async function exportOrg(orgId: string): Promise<OrgFixture> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw notFound("organisation");
  const campuses = await prisma.campus.findMany({
    where: { orgId },
    orderBy: { code: "asc" },
  });
  const campusIds = campuses.map((campus) => campus.id);
  const [sessions, students] = await Promise.all([
    prisma.academicSession.findMany({
      where: { campusId: { in: campusIds } },
      orderBy: { sequenceNo: "asc" },
    }),
    prisma.student.findMany({
      where: { campusId: { in: campusIds } },
      orderBy: { admissionNo: "asc" },
      select: {
        id: true,
        campusId: true,
        admissionNo: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    }),
  ]);
  return {
    kind: "org",
    version: 1,
    organization: { id: org.id, name: org.name, code: org.code },
    campuses: campuses.map((campus) => ({
      id: campus.id,
      name: campus.name,
      code: campus.code,
      timezone: campus.timezone,
      dateFormat: campus.dateFormat,
      currencyCode: campus.currencyCode,
      currentSessionId: campus.currentSessionId,
    })),
    sessions: sessions.map((session) => ({
      id: session.id,
      campusId: session.campusId,
      name: session.name,
      code: session.code,
      sequenceNo: session.sequenceNo,
      startDate: day(session.startDate),
      endDate: day(session.endDate),
      isCurrent: session.isCurrent,
      isActive: session.isActive,
    })),
    students,
  };
}

export function previewOrgFixture(raw: unknown) {
  const fixture = orgFixtureSchema.parse(raw);
  return {
    name: fixture.organization.name,
    code: fixture.organization.code,
    campuses: fixture.campuses.length,
    sessions: fixture.sessions.length,
    students: fixture.students.length,
  };
}

export async function restoreOrg(raw: unknown) {
  const fixture = orgFixtureSchema.parse(raw);
  const campusIds = new Set(fixture.campuses.map((campus) => campus.id));
  for (const session of fixture.sessions) {
    if (!campusIds.has(session.campusId)) {
      throw conflict("session campus is outside this organisation");
    }
  }
  for (const student of fixture.students) {
    if (!campusIds.has(student.campusId)) {
      throw conflict("student campus is outside this organisation");
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.organization.upsert({
      where: { id: fixture.organization.id },
      create: fixture.organization,
      update: {
        name: fixture.organization.name,
        code: fixture.organization.code,
      },
    });

    for (const campus of fixture.campuses) {
      const existing = await tx.campus.findUnique({
        where: { id: campus.id },
        select: { orgId: true },
      });
      if (existing && existing.orgId !== fixture.organization.id) {
        throw conflict("campus belongs to another organisation");
      }
      const data = {
        orgId: fixture.organization.id,
        name: campus.name,
        code: campus.code,
        timezone: campus.timezone,
        dateFormat: campus.dateFormat,
        currencyCode: campus.currencyCode,
      };
      if (existing) {
        await tx.campus.update({ where: { id: campus.id }, data });
      } else {
        await tx.campus.create({ data: { id: campus.id, ...data } });
      }
    }

    for (const session of fixture.sessions) {
      const data = {
        campusId: session.campusId,
        name: session.name,
        code: session.code,
        sequenceNo: session.sequenceNo,
        startDate: session.startDate ? new Date(session.startDate) : null,
        endDate: session.endDate ? new Date(session.endDate) : null,
        isCurrent: session.isCurrent,
        isActive: session.isActive,
      };
      await tx.academicSession.upsert({
        where: { id: session.id },
        create: { id: session.id, ...data },
        update: data,
      });
    }

    for (const campus of fixture.campuses) {
      if (!campus.currentSessionId) continue;
      const session = fixture.sessions.find((row) => row.id === campus.currentSessionId);
      if (!session || session.campusId !== campus.id) {
        throw conflict("current session is outside this campus");
      }
      await tx.campus.update({
        where: { id: campus.id },
        data: { currentSessionId: campus.currentSessionId },
      });
    }

    for (const student of fixture.students) {
      const existing = await tx.student.findUnique({
        where: { id: student.id },
        select: { campusId: true },
      });
      if (existing && !campusIds.has(existing.campusId)) {
        throw conflict("student belongs to another organisation");
      }
      const data = {
        campusId: student.campusId,
        admissionNo: student.admissionNo,
        firstName: student.firstName,
        lastName: student.lastName,
        status: student.status as StudentStatus,
      };
      await tx.student.upsert({
        where: { id: student.id },
        create: { id: student.id, ...data },
        update: data,
      });
    }

    const keep = fixture.students.map((student) => student.id);
    await tx.student.deleteMany({
      where: {
        campusId: { in: [...campusIds] },
        ...(keep.length ? { id: { notIn: keep } } : {}),
      },
    });

    return {
      orgId: fixture.organization.id,
      students: fixture.students.length,
    };
  }, { timeout: 20000 });
}

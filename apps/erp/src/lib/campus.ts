import { prisma } from "./db";
import { notFound } from "./errors";
import type { AuthPrincipal } from "./permissions";

export async function currentSessionId(user: AuthPrincipal) {
  const campus = await prisma.campus.findUnique({
    where: { id: user.campusId },
  });
  if (!campus) throw notFound("campus");
  if (campus.currentSessionId) return campus.currentSessionId;
  const session = await prisma.academicSession.findFirst({
    where: { campusId: user.campusId, isCurrent: true },
  });
  return session?.id ?? null;
}

export async function sessionInCampus(campusId: string, sessionId: string) {
  const session = await prisma.academicSession.findFirst({
    where: { id: sessionId, campusId },
  });
  if (!session) throw notFound("session");
  return session;
}

export async function classInCampus(campusId: string, classId: string) {
  const row = await prisma.class.findFirst({
    where: { id: classId, program: { department: { campusId } } },
    include: { program: true },
  });
  if (!row) throw notFound("class");
  return row;
}

export async function sectionInCampus(campusId: string, sectionId: string) {
  const row = await prisma.section.findFirst({
    where: { id: sectionId, class: { program: { department: { campusId } } } },
    include: { class: true },
  });
  if (!row) throw notFound("section");
  return row;
}

export function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return new Date(`${value}T00:00:00.000Z`);
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
}

export async function campusSummary(campusId: string) {
  const campus = await prisma.campus.findUnique({
    where: { id: campusId },
    include: { org: true },
  });
  if (!campus) throw notFound("campus");
  const session = campus.currentSessionId
    ? await prisma.academicSession.findUnique({
        where: { id: campus.currentSessionId },
      })
    : await prisma.academicSession.findFirst({
        where: { campusId, isCurrent: true },
      });
  return {
    id: campus.id,
    name: campus.name,
    code: campus.code,
    org: campus.org.name,
    session: session
      ? { id: session.id, name: session.name, isCurrent: session.isCurrent }
      : null,
  };
}

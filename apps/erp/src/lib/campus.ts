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

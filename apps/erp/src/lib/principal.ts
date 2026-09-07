import { ActorType } from "@prisma/client";
import { prisma } from "./db";
import { forbidden, unauthenticated } from "./errors";
import type { AuthPrincipal } from "./permissions";
import { verifyAuthToken } from "./auth-token";
import {
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
} from "./password";

const PORTAL_ACTOR: Record<string, ActorType> = {
  staff: ActorType.STAFF,
  student: ActorType.STUDENT,
  parent: ActorType.GUARDIAN,
};

export async function loadPrincipal(userId: string): Promise<AuthPrincipal> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      guardian: { include: { links: true } },
      roles: {
        include: {
          role: {
            include: { grants: { include: { permission: true } } },
          },
        },
      },
    },
  });
  if (!user || !user.isActive) {
    throw unauthenticated();
  }
  const roles = user.roles.map((r) => r.role.name);
  const permissions = [
    ...new Set(
      user.roles.flatMap((r) =>
        r.role.grants.map(
          (g) =>
            `${g.permission.module}.${g.permission.feature}.${g.permission.action}`,
        ),
      ),
    ),
  ];
  return {
    id: user.id,
    campusId: user.campusId,
    actorType: user.actorType,
    roles,
    permissions,
    studentId: user.student?.id ?? null,
    guardianId: user.guardian?.id ?? null,
    childIds: user.guardian?.links.map((link) => link.studentId) ?? [],
  };
}

export async function authenticateCredentials(input: {
  username: string;
  password: string;
  portal: string;
}): Promise<AuthPrincipal> {
  const actorType = PORTAL_ACTOR[input.portal];
  if (!actorType) {
    throw unauthenticated();
  }
  const user = await prisma.user.findFirst({
    where: { username: input.username, actorType },
  });
  if (!user || !user.isActive) {
    throw unauthenticated();
  }
  const matches = await verifyPassword(input.password, user.passwordHash);
  if (!matches) {
    throw unauthenticated();
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      ...(passwordNeedsRehash(user.passwordHash)
        ? { passwordHash: await hashPassword(input.password) }
        : {}),
    },
  });
  return loadPrincipal(user.id);
}

export async function principalFromRequest(
  request: Request,
): Promise<AuthPrincipal> {
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("erp_token="))
    ?.slice("erp_token=".length);
  const token = bearer ?? cookie;
  if (!token) throw unauthenticated();
  const parsed = await verifyAuthToken(decodeURIComponent(token));
  if (!parsed) throw unauthenticated();
  return loadPrincipal(parsed.id);
}

export async function requireApiPermission(
  request: Request,
  module: string,
  feature: string,
  action: string,
) {
  const user = await principalFromRequest(request);
  const { requirePermission } = await import("./permissions");
  requirePermission(user, module, feature, action);
  return user;
}

export function assertStaff(user: AuthPrincipal) {
  if (user.actorType !== ActorType.STAFF) {
    throw forbidden("staff only");
  }
}

/** Never trust a client-supplied studentId for students/parents. */
export function assertCanAccessStudent(user: AuthPrincipal, studentId: string) {
  if (user.actorType === ActorType.STAFF) return;
  if (user.actorType === ActorType.STUDENT) {
    if (!user.studentId || user.studentId !== studentId) {
      throw forbidden("forbidden");
    }
    return;
  }
  if (user.actorType === ActorType.GUARDIAN) {
    if (!user.childIds?.includes(studentId)) {
      throw forbidden("forbidden");
    }
    return;
  }
  throw forbidden("forbidden");
}

export function visibleStudentIds(user: AuthPrincipal): string[] | null {
  if (user.actorType === ActorType.STAFF) return null;
  if (user.actorType === ActorType.STUDENT) {
    return user.studentId ? [user.studentId] : [];
  }
  if (user.actorType === ActorType.GUARDIAN) return user.childIds ?? [];
  return [];
}

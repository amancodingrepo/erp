import { ActorType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { forbidden, unauthenticated } from "./errors";
import type { AuthPrincipal } from "./permissions";
import { verifyAuthToken } from "./auth-token";

const PORTAL_ACTOR: Record<string, ActorType> = {
  staff: ActorType.STAFF,
  student: ActorType.STUDENT,
  parent: ActorType.GUARDIAN,
};

export async function loadPrincipal(userId: string): Promise<AuthPrincipal> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
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
  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) {
    throw unauthenticated();
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
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

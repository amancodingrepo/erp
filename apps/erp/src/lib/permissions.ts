import { forbidden } from "./errors";

export type AuthPrincipal = {
  id: string;
  campusId: string;
  actorType: string;
  roles: string[];
  permissions: string[];
  studentId?: string | null;
  guardianId?: string | null;
  childIds?: string[];
};

export function permKey(module: string, feature: string, action: string) {
  return `${module}.${feature}.${action}`;
}

export function hasPermission(
  user: AuthPrincipal | null | undefined,
  perm: string,
): boolean {
  if (!user) return false;
  if (
    user.roles.includes("SuperAdmin") ||
    user.roles.includes("PlatformAdmin")
  ) {
    return true;
  }
  return user.permissions.includes(perm);
}

export function requirePermission(
  user: AuthPrincipal | null | undefined,
  module: string,
  feature: string,
  action: string,
) {
  if (!hasPermission(user, permKey(module, feature, action))) {
    throw forbidden();
  }
}

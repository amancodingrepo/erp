import { prisma } from "./db";
import { conflict, forbidden } from "./errors";

export function assertSchoolCannotGrantPlatform(actorRoles: string[], roleNames: string[]) {
  if (!roleNames.includes("PlatformAdmin")) return;
  if (actorRoles.includes("PlatformAdmin")) return;
  throw forbidden("only a platform admin can grant platform access");
}

export async function assertCanChangeSuperAdmin(input: {
  campusId: string;
  userId: string;
  currentlyActive: boolean;
  currentlySuperAdmin: boolean;
  nextIsActive?: boolean;
  nextRoleNames?: string[] | null;
}) {
  if (!input.currentlyActive || !input.currentlySuperAdmin) return;
  const disabling = input.nextIsActive === false;
  const demoting =
    input.nextRoleNames != null &&
    !input.nextRoleNames.includes("SuperAdmin");
  if (!disabling && !demoting) return;
  const others = await prisma.user.count({
    where: {
      campusId: input.campusId,
      isActive: true,
      id: { not: input.userId },
      roles: { some: { role: { name: "SuperAdmin" } } },
    },
  });
  if (others === 0) {
    throw conflict("cannot disable or demote the last SuperAdmin");
  }
}

export async function assertCanChangePlatformAdmin(input: {
  userId: string;
  currentlyActive: boolean;
  currentlyPlatformAdmin: boolean;
  nextIsActive?: boolean;
  nextRoleNames?: string[] | null;
}) {
  if (!input.currentlyActive || !input.currentlyPlatformAdmin) return;
  const disabling = input.nextIsActive === false;
  const demoting =
    input.nextRoleNames != null &&
    !input.nextRoleNames.includes("PlatformAdmin");
  if (!disabling && !demoting) return;
  const others = await prisma.user.count({
    where: {
      isActive: true,
      id: { not: input.userId },
      roles: { some: { role: { name: "PlatformAdmin" } } },
    },
  });
  if (others === 0) {
    throw conflict("cannot disable or demote the last platform admin");
  }
}

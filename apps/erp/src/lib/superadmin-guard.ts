import { prisma } from "./db";
import { conflict } from "./errors";

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

import { prisma } from "@/lib/db";
import { forbidden, notFound, validationError } from "@/lib/errors";
import { loadPrincipal } from "@/lib/principal";

export type MembershipPerson = {
  id: string;
  email?: string | null;
  username: string;
  orgId: string;
};

export function parseSwitchBody(value: unknown) {
  if (!value || typeof value !== "object") {
    throw validationError({ membership_id: "required" });
  }
  const rec = value as Record<string, unknown>;
  const id = String(
    rec.membership_id ?? rec.membershipId ?? rec.userId ?? "",
  ).trim();
  if (!id) throw validationError({ membership_id: "required" });
  return id;
}

export function toMembershipAlias<
  T extends { userId: string },
>(row: T) {
  return {
    ...row,
    membershipId: row.userId,
    membership_id: row.userId,
  };
}

export function membershipMatches(
  me: MembershipPerson,
  other: MembershipPerson & { isActive: boolean },
) {
  if (!other.isActive || other.orgId !== me.orgId) return false;
  if (other.id === me.id) return true;
  const email = me.email?.trim().toLowerCase();
  const otherEmail = other.email?.trim().toLowerCase();
  return Boolean(email && otherEmail && email === otherEmail);
}

export async function listMemberships(userId: string) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    include: { campus: { select: { orgId: true, name: true, code: true } } },
  });
  if (!me || !me.isActive) throw notFound("user");
  const rows = await prisma.user.findMany({
    where: {
      isActive: true,
      campus: { orgId: me.campus.orgId },
      ...(me.email
        ? {
            OR: [
              { id: me.id },
              { email: { equals: me.email, mode: "insensitive" as const } },
            ],
          }
        : { id: me.id }),
    },
    include: { campus: { select: { id: true, name: true, code: true, orgId: true } } },
    orderBy: [{ actorType: "asc" }, { username: "asc" }],
  });
  return rows
    .filter((row) =>
      membershipMatches(
        { id: me.id, email: me.email, username: me.username, orgId: me.campus.orgId },
        {
          id: row.id,
          email: row.email,
          username: row.username,
          orgId: row.campus.orgId,
          isActive: row.isActive,
        },
      ),
    )
    .map((row) =>
      toMembershipAlias({
        userId: row.id,
        actorType: row.actorType,
        campusId: row.campusId,
        campusName: row.campus.name,
        campusCode: row.campus.code,
        username: row.username,
        current: row.id === me.id,
      }),
    );
}

export async function switchMembership(fromUserId: string, toUserId: string) {
  const list = await listMemberships(fromUserId);
  const target = list.find((row) => row.userId === toUserId);
  if (!target) throw forbidden("membership");
  return loadPrincipal(target.userId, target.campusId);
}

export function homeForActor(actorType: string) {
  if (actorType === "STUDENT") return "/student/dashboard";
  if (actorType === "GUARDIAN") return "/parent/dashboard";
  return "/staff/dashboard";
}

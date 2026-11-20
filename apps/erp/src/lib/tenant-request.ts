import { prisma } from "./db";
import { forbidden, notFound } from "./errors";
import type { AuthPrincipal } from "./permissions";
import { enterTenant } from "./tenant-context";
import { ensureTenantPolicies } from "./tenant-rls";

function requestedOrg(request: Request) {
  const header = request.headers.get("x-org-id")?.trim() ?? "";
  if (header) return header;
  return new URL(request.url).searchParams.get("orgId")?.trim() ?? "";
}

export async function bindRequestTenant(user: AuthPrincipal, request: Request) {
  const home = await prisma.campus.findUnique({
    where: { id: user.campusId },
    select: { orgId: true },
  });
  if (!home) return;
  let orgId = home.orgId;
  const requested = requestedOrg(request);
  const platform = user.roles.includes("PlatformAdmin");
  if (requested && requested !== orgId) {
    if (!platform) {
      throw forbidden("only a platform admin can choose another organisation");
    }
    const org = await prisma.organization.findUnique({
      where: { id: requested },
      select: { id: true },
    });
    if (!org) throw notFound("organisation");
    orgId = org.id;
  }
  const campuses = await prisma.campus.findMany({
    where: { orgId },
    select: { id: true },
  });
  enterTenant({
    orgId,
    campusIds: campuses.map((row) => row.id),
    actorId: user.id,
    platform,
  });
  await ensureTenantPolicies();
}

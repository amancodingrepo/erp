import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { forbidden } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { exportOrg } from "@/lib/org-backup";
import { requireApiPermission } from "@/lib/principal";
import { isPlatformAdmin } from "@/lib/services/tenants";

async function assertOrgOperator(request: Request, orgId: string) {
  const user = await requireApiPermission(request, "settings", "backup", "edit");
  if (isPlatformAdmin(user)) return user;
  const campus = await prisma.campus.findUnique({
    where: { id: user.campusId },
    select: { orgId: true },
  });
  if (campus?.orgId !== orgId) throw forbidden("another organisation");
  return user;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await assertOrgOperator(request, id);
    const fixture = await exportOrg(id);
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "backup",
      entity: "org",
      entityId: id,
      ip: requestIp(request),
    });
    return ok(fixture);
  } catch (error) {
    return fail(error);
  }
}

import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { forbidden } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { orgFixtureSchema, restoreOrg } from "@/lib/org-backup";
import { requireApiPermission } from "@/lib/principal";
import { isPlatformAdmin } from "@/lib/services/tenants";

const bodySchema = z.object({
  confirm: z.string().min(1),
  fixture: orgFixtureSchema,
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await requireApiPermission(request, "settings", "backup", "edit");
    if (!isPlatformAdmin(user)) {
      const campus = await prisma.campus.findUnique({
        where: { id: user.campusId },
        select: { orgId: true },
      });
      if (campus?.orgId !== id) throw forbidden("another organisation");
    }
    const body = bodySchema.parse(await readJson(request));
    if (body.fixture.organization.id !== id) {
      throw forbidden("fixture organisation does not match");
    }
    if (body.confirm !== body.fixture.organization.code) {
      throw forbidden("type the organisation code to restore it");
    }
    const restored = await restoreOrg(body.fixture);
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "restore",
      entity: "org",
      entityId: id,
      ip: requestIp(request),
      after: { students: restored.students },
    });
    return ok({ ok: true, ...restored });
  } catch (error) {
    return fail(error);
  }
}

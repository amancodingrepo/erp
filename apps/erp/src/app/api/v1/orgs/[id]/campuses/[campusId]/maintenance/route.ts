import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { assertPlatformAdmin, setCampusMaintenance } from "@/lib/services/tenants";

const bodySchema = z.object({ readOnly: z.boolean() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string; campusId: string }> }) {
  try {
    const user = await requireApiPermission(request, "tenants", "campus", "edit");
    assertPlatformAdmin(user);
    const { id, campusId } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const saved = await setCampusMaintenance(id, campusId, body.readOnly);
    await writeAudit({ userId: user.id, campusId, action: body.readOnly ? "maintenance.on" : "maintenance.off", entity: "campus", entityId: campusId, after: saved, ip: requestIp(request) });
    return ok(saved);
  } catch (error) { return fail(error); }
}

import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { assertPlatformAdmin, setOrgArchived } from "@/lib/services/tenants";

const bodySchema = z.object({ archived: z.boolean().optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission(request, "tenants", "campus", "edit");
    assertPlatformAdmin(user);
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const archived = body.archived !== false;
    const result = await setOrgArchived(id, archived);
    await writeAudit({ userId: user.id, campusId: user.campusId, action: archived ? "archive" : "unarchive", entity: "org", entityId: id, after: result, ip: requestIp(request) });
    return ok(result);
  } catch (error) { return fail(error); }
}

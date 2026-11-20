import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { addCampus, assertPlatformAdmin } from "@/lib/services/tenants";

const bodySchema = z.object({ name: z.string().min(2), code: z.string().min(2) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission(request, "tenants", "campus", "create");
    assertPlatformAdmin(user);
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const createdCampus = await addCampus(id, body);
    await writeAudit({ userId: user.id, campusId: user.campusId, action: "create", entity: "campus", entityId: createdCampus.campus.id, after: { orgId: id, code: createdCampus.campus.code, principalUsername: createdCampus.principalUsername }, ip: requestIp(request) });
    return created(createdCampus);
  } catch (error) { return fail(error); }
}

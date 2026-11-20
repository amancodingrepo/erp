import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requirePlatformDesk, updatePlatformTemplate } from "@/lib/platform-desk";

const bodySchema = z.object({ body: z.string().min(1) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePlatformDesk(request, "edit");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const saved = await updatePlatformTemplate(id, body.body);
    await writeAudit({ userId: user.id, campusId: saved.campusId, action: "update", entity: "print-template", entityId: id, ip: requestIp(request) });
    return ok(saved);
  } catch (error) { return fail(error); }
}

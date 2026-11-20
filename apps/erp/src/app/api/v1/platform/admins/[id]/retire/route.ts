import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";
import { requirePlatformDesk, retirePlatformAdmin } from "@/lib/platform-desk";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePlatformDesk(request, "edit");
    const { id } = await context.params;
    const retired = await retirePlatformAdmin(id);
    await writeAudit({ userId: user.id, campusId: user.campusId, action: "platform-admin.retire", entity: "user", entityId: id, after: { username: retired.username }, ip: requestIp(request) });
    return ok(retired);
  } catch (error) { return fail(error); }
}

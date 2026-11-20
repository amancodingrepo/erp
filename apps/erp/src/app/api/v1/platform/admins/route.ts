import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { created, fail, readJson } from "@/lib/http";
import { invitePlatformAdmin, requirePlatformDesk } from "@/lib/platform-desk";

const bodySchema = z.object({ username: z.string().min(3) });

export async function POST(request: Request) {
  try {
    const user = await requirePlatformDesk(request, "edit");
    const body = bodySchema.parse(await readJson(request));
    const invited = await invitePlatformAdmin(body.username);
    await writeAudit({ userId: user.id, campusId: user.campusId, action: "platform-admin.invite", entity: "user", entityId: invited.id, after: { username: invited.username }, ip: requestIp(request) });
    return created(invited);
  } catch (error) { return fail(error); }
}

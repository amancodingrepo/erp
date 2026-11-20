import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { created, fail, readJson } from "@/lib/http";
import { broadcastToPrincipals, requirePlatformDesk } from "@/lib/platform-desk";

const bodySchema = z.object({ title: z.string().min(2), body: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const user = await requirePlatformDesk(request, "edit");
    const body = bodySchema.parse(await readJson(request));
    const sent = await broadcastToPrincipals(user, body.title, body.body);
    await writeAudit({ userId: user.id, campusId: user.campusId, action: "broadcast", entity: "notice", entityId: user.campusId, after: { title: body.title, campuses: sent.campuses }, ip: requestIp(request) });
    return created(sent);
  } catch (error) { return fail(error); }
}

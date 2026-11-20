import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { readPlatformModules, requirePlatformDesk, writePlatformModules } from "@/lib/platform-desk";

export async function GET(request: Request) {
  try {
    await requirePlatformDesk(request, "view");
    return ok({ modules: await readPlatformModules() });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requirePlatformDesk(request, "edit");
    const modules = await writePlatformModules(await readJson(request));
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "module.platform",
      entity: "platform",
      entityId: "modules",
      after: modules,
      ip: requestIp(request),
    });
    return ok({ modules });
  } catch (error) {
    return fail(error);
  }
}

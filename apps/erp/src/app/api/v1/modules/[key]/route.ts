import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { loadModuleFlags, setModuleFlag } from "@/lib/modules";
import { requireApiPermission } from "@/lib/principal";

const bodySchema = z.object({ enabled: z.boolean() });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "modules",
      "edit",
    );
    const { key } = await context.params;
    const id = decodeURIComponent(key)
      .replace(/^module\./, "")
      .replace(/\.enabled$/, "");
    const body = bodySchema.parse(await readJson(request));
    await setModuleFlag(user.campusId, id, body.enabled);
    const flags = await loadModuleFlags(user.campusId);
    return ok({ id, enabled: flags[id] ?? body.enabled, flags });
  } catch (error) {
    return fail(error);
  }
}

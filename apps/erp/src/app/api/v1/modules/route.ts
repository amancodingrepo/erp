import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import {
  loadModuleFlags,
  OPTIONAL_MODULES,
  setModuleFlag,
} from "@/lib/modules";
import { assertStaff, principalFromRequest, requireApiPermission } from "@/lib/principal";

const patchSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
});

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const flags = await loadModuleFlags(user.campusId);
    return ok({
      data: Object.entries(flags).map(([id, enabled]) => ({ id, enabled })),
      flags,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "modules",
      "edit",
    );
    const body = patchSchema.parse(await readJson(request));
    const id = body.key.replace(/^module\./, "").replace(/\.enabled$/, "");
    await setModuleFlag(user.campusId, id, body.enabled);
    const flags = await loadModuleFlags(user.campusId);
    return ok({
      id,
      enabled: flags[id] ?? body.enabled,
      flags,
      known: (OPTIONAL_MODULES as readonly string[]).includes(id),
    });
  } catch (error) {
    return fail(error);
  }
}

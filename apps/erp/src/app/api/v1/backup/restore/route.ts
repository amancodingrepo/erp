import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { restoreDbDump } from "@/lib/db-backup";
import { forbidden } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const bodySchema = z.object({
  name: z.string().min(1),
  confirm: z.literal("RESTORE ALL CAMPUSES"),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "backup",
      "edit",
    );
    if (
      !user.roles.includes("SuperAdmin") &&
      !user.roles.includes("PlatformAdmin")
    ) {
      throw forbidden("platform admin only");
    }
    const body = bodySchema.parse(await readJson(request));
    const dump = await restoreDbDump(body.name);
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "restore",
      entity: "database",
      entityId: dump.name,
      ip: requestIp(request),
    });
    return ok({
      ok: true,
      dump,
      warning:
        "Full database restored for every campus. Sign in again if sessions were reset.",
    });
  } catch (error) {
    return fail(error);
  }
}

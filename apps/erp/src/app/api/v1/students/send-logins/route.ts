import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { assertStaff, requireApiPermission } from "@/lib/principal";
import { sendLoginCredentials } from "@/lib/services/login-credentials";

const bodySchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1).max(200),
  portals: z.array(z.enum(["student", "parent"])).min(1),
});

/** Emails new temporary portal passwords; see login-credentials.ts for when a password changes. */
export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    assertStaff(user);
    const body = bodySchema.parse(await readJson(request));
    const result = await sendLoginCredentials({ campusId: user.campusId, studentIds: body.studentIds, portals: body.portals });
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "send-logins",
      entity: "student",
      after: { sent: result.sent, skipped: result.skipped, failed: result.failed, students: body.studentIds.length, portals: body.portals },
      ip: requestIp(request),
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

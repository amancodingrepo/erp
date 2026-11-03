import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requireStaff } from "@/lib/school-world-bridge";
import { sendFeeReminder } from "@/lib/school-world-messaging";

export async function POST(request: Request, context: { params: Promise<{ studentCode: string }> }) {
  try {
    const user = await requireStaff(request);
    const { studentCode } = await context.params;
    const body = await readJson<{ academicYear?: string }>(request);
    const result = await sendFeeReminder(user.campusId, user.id, decodeURIComponent(studentCode), String(body.academicYear ?? ""));
    await writeAudit({ userId: user.id, campusId: user.campusId, action: "fee-reminder", entity: "Student", entityId: decodeURIComponent(studentCode), after: { academicYear: body.academicYear ?? null, total: result.total, parents: result.recipientCount }, ip: requestIp(request) });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

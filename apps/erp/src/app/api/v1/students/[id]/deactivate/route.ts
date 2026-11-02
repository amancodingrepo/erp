import { StudentStatus } from "@prisma/client";
import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseStudentDeactivate } from "@/lib/services/campus-spec-aliases";
import { disableStudent } from "@/lib/services/campus-student-status";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "delete",
    );
    const { id } = await context.params;
    const body = parseStudentDeactivate(await readJson(request));
    const { student, previousStatus } = await disableStudent(
      user.campusId,
      id,
      body.reasonId,
    );
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "students.disable",
      entity: "Student",
      entityId: id,
      before: { status: previousStatus },
      after: { status: StudentStatus.DISABLED, reasonId: body.reasonId },
      ip: requestIp(request),
    });
    return ok(student);
  } catch (error) {
    return fail(error);
  }
}

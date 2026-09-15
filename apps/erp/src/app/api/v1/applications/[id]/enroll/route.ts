import { created, fail, readJson } from "@/lib/http";
import { assertStaff, requireApiPermission } from "@/lib/principal";
import {
  enrollApplication,
  enrollSchema,
} from "@/lib/services/applications";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "create",
    );
    assertStaff(user);
    const { id } = await context.params;
    const body = enrollSchema.parse(await readJson(request));
    const result = await enrollApplication(user.campusId, id, body);
    return created({
      applicationId: result.application.id,
      status: result.application.status,
      studentId: result.student.id,
      admissionNo: result.student.admissionNo,
      portals: result.portals,
    });
  } catch (error) {
    return fail(error);
  }
}

import { created, fail, readJson } from "@/lib/http";
import { assertStaff, requireApiPermission } from "@/lib/principal";
import {
  parseConvertToStudent,
  resolveRollTarget,
} from "@/lib/services/campus-spec-aliases";
import { enrollApplication } from "@/lib/services/applications";

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
    const parsed = parseConvertToStudent(await readJson(request));
    const target = await resolveRollTarget(user.campusId, {
      classId: parsed.classId,
      sectionId: parsed.sectionId,
    });
    const result = await enrollApplication(user.campusId, id, {
      classId: target.classId,
      sectionId: target.sectionId,
      sessionId: parsed.sessionId,
      admissionNo: parsed.admissionNo,
    });
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

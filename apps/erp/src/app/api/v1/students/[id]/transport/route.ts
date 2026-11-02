import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { assignTransport } from "@/lib/services/campus-housing";
import { parseStudentTransport } from "@/lib/services/campus-route-stops";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    const body = parseStudentTransport(await readJson(request));
    return ok(
      await assignTransport({
        campusId: user.campusId,
        studentId: id,
        ...body,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

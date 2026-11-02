import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { deleteStudentDocument } from "@/lib/services/campus-student-docs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const { id, docId } = await context.params;
    return ok(await deleteStudentDocument(user.campusId, id, docId));
  } catch (error) {
    return fail(error);
  }
}

import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { deleteStaffDocument } from "@/lib/services/campus-staff-docs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "edit");
    const { id, docId } = await context.params;
    return ok(await deleteStaffDocument(user.campusId, id, docId));
  } catch (error) {
    return fail(error);
  }
}

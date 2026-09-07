import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { returnBook } from "@/lib/services/library";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    const result = await returnBook(user.campusId, id);
    return ok({
      fine: result.fine,
      invoiceId: result.invoiceId,
      returnedAt: result.issue.returnedAt,
    });
  } catch (error) {
    return fail(error);
  }
}

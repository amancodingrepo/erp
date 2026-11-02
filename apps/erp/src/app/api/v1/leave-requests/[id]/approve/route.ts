import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { approveLeave } from "@/lib/services/attendance";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "attendance",
      "leave",
      "approve",
    );
    const { id } = await context.params;
    return ok(await approveLeave({ user, requestId: id }));
  } catch (error) {
    return fail(error);
  }
}

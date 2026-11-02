import { fail, ok } from "@/lib/http";
import { deleteMessage, requireStaff } from "@/lib/school-world-bridge";

export async function DELETE(request: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { messageId } = await context.params;
    await deleteMessage(user.campusId, user.id, decodeURIComponent(messageId));
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

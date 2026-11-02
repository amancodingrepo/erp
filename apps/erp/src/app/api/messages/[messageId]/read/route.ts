import { fail, ok } from "@/lib/http";
import { markMessageRead, requireStaff } from "@/lib/school-world-bridge";

export async function POST(request: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { messageId } = await context.params;
    return ok(await markMessageRead(user.campusId, user.id, decodeURIComponent(messageId)));
  } catch (error) {
    return fail(error);
  }
}

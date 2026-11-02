import { fail, ok } from "@/lib/http";
import { messageRecipients, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok(await messageRecipients(user.campusId));
  } catch (error) {
    return fail(error);
  }
}

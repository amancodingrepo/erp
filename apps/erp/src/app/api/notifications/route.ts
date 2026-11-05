import { fail, ok } from "@/lib/http";
import { requireStaff } from "@/lib/school-world-bridge";
import { staffNotifications } from "@/lib/school-world-notifications";

/** The bell in the staff top bar. Read-only; items are marked read where they are opened. */
export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok(await staffNotifications(user));
  } catch (error) {
    return fail(error);
  }
}

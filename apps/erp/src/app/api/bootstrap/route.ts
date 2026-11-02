import { fail, ok } from "@/lib/http";
import { bootstrap, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok(await bootstrap(user));
  } catch (error) {
    return fail(error);
  }
}

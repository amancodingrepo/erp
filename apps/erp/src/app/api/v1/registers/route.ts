import { ok, fail } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { publicRegisterKinds } from "@/lib/services/registers";

/** Field definitions for every register, so screens build their forms from the server's rules. */
export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    return ok({ data: publicRegisterKinds() });
  } catch (error) {
    return fail(error);
  }
}

import { forbidden } from "@/lib/errors";
import { fail } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";

export async function DELETE(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    throw forbidden("Screen records are read-only in production v1");
  } catch (error) {
    return fail(error);
  }
}

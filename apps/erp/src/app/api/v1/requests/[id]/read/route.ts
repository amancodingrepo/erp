import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { markRequestRead } from "@/lib/services/diary";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    const { id } = await context.params;
    return ok(await markRequestRead(user, id));
  } catch (error) {
    return fail(error);
  }
}

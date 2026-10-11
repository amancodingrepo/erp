import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { closeRequest } from "@/lib/services/diary";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    const { id } = await context.params;
    return ok(await closeRequest(user, id));
  } catch (error) {
    return fail(error);
  }
}

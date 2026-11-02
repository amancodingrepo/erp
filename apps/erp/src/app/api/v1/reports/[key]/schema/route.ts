import { fail, ok } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { reportSchema } from "@/lib/reports";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const { key } = await context.params;
    return ok({ data: reportSchema(key) });
  } catch (error) {
    return fail(error);
  }
}

import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { yearEndPromote } from "@/lib/services/promotion";

export async function POST(
  request: Request,
  context: { params: Promise<{ kind: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "create",
    );
    const { kind } = await context.params;
    return ok(await yearEndPromote(user.campusId, kind, await readJson(request)));
  } catch (error) {
    return fail(error);
  }
}

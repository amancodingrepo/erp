import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getSessionPrefix,
  patchSessionPrefix,
  removeSessionPrefix,
} from "@/lib/services/campus-session-prefixes";
import { parseSessionPrefixPatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "view",
    );
    const { id } = await context.params;
    return ok(await getSessionPrefix(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "create",
    );
    const { id } = await context.params;
    const body = parseSessionPrefixPatch(await readJson(request));
    return ok(await patchSessionPrefix(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "create",
    );
    const { id } = await context.params;
    return ok({ data: await removeSessionPrefix(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}

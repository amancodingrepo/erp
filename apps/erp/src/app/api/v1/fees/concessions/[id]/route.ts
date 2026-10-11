import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseFeeConcessionPatch } from "@/lib/services/campus-spec-aliases";
import {
  getConcession,
  patchConcession,
  removeConcession,
} from "@/lib/services/fees-concessions";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const { id } = await context.params;
    return ok(await getConcession(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "collect");
    const { id } = await context.params;
    const body = parseFeeConcessionPatch(await readJson(request));
    return ok(await patchConcession(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "collect");
    const { id } = await context.params;
    return ok({ data: await removeConcession(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}

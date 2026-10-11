import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getProgram,
  patchProgram,
  removeProgram,
} from "@/lib/services/campus-programs";
import { parseProgramPatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "program", "view");
    const { id } = await context.params;
    return ok(await getProgram(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "program", "create");
    const { id } = await context.params;
    const body = parseProgramPatch(await readJson(request));
    return ok(await patchProgram(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "program", "create");
    const { id } = await context.params;
    return ok({ data: await removeProgram(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}

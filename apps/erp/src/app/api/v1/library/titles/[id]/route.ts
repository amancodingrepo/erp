import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseLibraryTitlePatch } from "@/lib/services/campus-spec-aliases";
import { getBook, patchBook, removeBook } from "@/lib/services/library";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    return ok(await getBook(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    const body = parseLibraryTitlePatch(await readJson(request));
    return ok(await patchBook(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    return ok({ data: await removeBook(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}

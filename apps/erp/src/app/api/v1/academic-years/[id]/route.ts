import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getAcademicYear,
  parseAcademicYearPatch,
  patchAcademicYear,
  removeAcademicYear,
} from "@/lib/services/session-context";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "session", "view");
    const { id } = await context.params;
    return ok(await getAcademicYear(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "session", "edit");
    const { id } = await context.params;
    const body = parseAcademicYearPatch(await readJson(request));
    return ok(await patchAcademicYear(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "session", "edit");
    const { id } = await context.params;
    return ok({ data: await removeAcademicYear(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}

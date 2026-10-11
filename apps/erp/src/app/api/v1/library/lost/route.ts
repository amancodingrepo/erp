import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseLibraryLost } from "@/lib/services/campus-spec-aliases";
import { listLost, saveLost } from "@/lib/services/library";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await listLost(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = parseLibraryLost(await readJson(request));
    return created(await saveLost(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseLibraryTitle } from "@/lib/services/campus-spec-aliases";
import { createBook, listBooks } from "@/lib/services/library";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await listBooks(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = parseLibraryTitle(await readJson(request));
    return created(await createBook(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

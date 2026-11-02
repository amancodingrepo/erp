import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseBroadcastList } from "@/lib/services/campus-spec-aliases";
import {
  listBroadcastLists,
  saveBroadcastList,
} from "@/lib/services/directory";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await listBroadcastLists(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = parseBroadcastList(await readJson(request));
    return created(await saveBroadcastList(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

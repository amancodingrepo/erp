import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseHouseBulkAssign } from "@/lib/services/campus-spec-aliases";
import { changeHouse } from "@/lib/services/diary";

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const body = parseHouseBulkAssign(await readJson(request));
    return ok(await changeHouse(user.campusId, body.studentIds, body.houseId));
  } catch (error) {
    return fail(error);
  }
}

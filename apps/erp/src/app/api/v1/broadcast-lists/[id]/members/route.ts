import { fail, ok, readJson } from "@/lib/http";
import { notFound } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { parseBroadcastMembers } from "@/lib/services/campus-spec-aliases";
import {
  listBroadcastLists,
  saveBroadcastList,
} from "@/lib/services/directory";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    const lists = await listBroadcastLists(user.campusId);
    const existing = lists.find((row) => row.id === id);
    if (!existing) throw notFound("broadcast list");
    const body = parseBroadcastMembers(await readJson(request));
    const studentIds = [...new Set([...existing.studentIds, ...body.studentIds])];
    const staffIds = [...new Set([...existing.staffIds, ...body.staffIds])];
    return ok(
      await saveBroadcastList(user.campusId, {
        id: existing.id,
        name: existing.name,
        studentIds,
        staffIds,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

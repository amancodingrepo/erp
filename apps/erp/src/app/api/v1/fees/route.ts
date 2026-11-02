import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { dueSearch } from "@/lib/services/fees";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "view");
    const params = new URL(request.url).searchParams;
    const feeGroupIds = params
      .getAll("feeGroupIds[]")
      .concat(params.getAll("fee_group_ids[]"))
      .concat(params.get("feeGroupIds") ? [params.get("feeGroupIds") as string] : [])
      .concat(params.get("fee_group_ids") ? [params.get("fee_group_ids") as string] : [])
      .filter(Boolean);
    return ok(
      await dueSearch({
        campusId: user.campusId,
        classId:
          params.get("class_id") ?? params.get("classId") ?? undefined,
        sectionId:
          params.get("section_id") ?? params.get("sectionId") ?? undefined,
        feeGroupIds,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

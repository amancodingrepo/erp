import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { dueSearch } from "@/lib/services/fees";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "view");
    const params = new URL(request.url).searchParams;
    const feeGroupIds = params.getAll("feeGroupIds[]").concat(
      params.get("feeGroupIds") ? [params.get("feeGroupIds") as string] : [],
    );
    return ok(
      await dueSearch({
        campusId: user.campusId,
        classId: params.get("classId") ?? undefined,
        sectionId: params.get("sectionId") ?? undefined,
        feeGroupIds: feeGroupIds.filter(Boolean),
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

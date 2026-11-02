import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { monthlyReport } from "@/lib/services/attendance";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "attendance",
      "student",
      "view",
    );
    const params = new URL(request.url).searchParams;
    return ok(
      await monthlyReport({
        campusId: user.campusId,
        sectionId: params.get("sectionId") ?? undefined,
        from: params.get("from") ?? undefined,
        to: params.get("to") ?? undefined,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

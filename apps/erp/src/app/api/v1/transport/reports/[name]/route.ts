import { fail, ok } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { parseReportFilters, runReport } from "@/lib/reports";

export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const { name } = await context.params;
    const params = new URL(request.url).searchParams;
    return ok(
      await runReport(
        name,
        user.campusId,
        parseReportFilters({
          classId: params.get("classId") ?? params.get("class_id"),
          sectionId: params.get("sectionId") ?? params.get("section_id"),
          from: params.get("from"),
          to: params.get("to"),
          feeGroupId: params.get("feeGroupId") ?? params.get("fee_group_id"),
        }),
      ),
    );
  } catch (error) {
    return fail(error);
  }
}

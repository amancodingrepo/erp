import { fail, ok, readJson } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { parseReportFilters, pickReportColumns, runReport } from "@/lib/reports";

export async function POST(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const { key } = await context.params;
    const json = (await readJson(request)) as {
      filters?: unknown;
      columns?: string[];
    } | null;
    const report = await runReport(
      key,
      user.campusId,
      parseReportFilters(json?.filters ?? json),
    );
    return ok(pickReportColumns(report, json?.columns));
  } catch (error) {
    return fail(error);
  }
}

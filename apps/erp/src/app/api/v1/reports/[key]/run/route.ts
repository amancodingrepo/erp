import { fail, ok, readJson } from "@/lib/http";
import { parseReportFilters, pickReportColumns, runReport } from "@/lib/reports";
import { requireReport } from "@/lib/reports/access";

export async function POST(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await context.params;
    const user = await requireReport(request, key);
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

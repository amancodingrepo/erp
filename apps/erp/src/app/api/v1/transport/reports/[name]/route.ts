import { fail, ok } from "@/lib/http";
import { runReport } from "@/lib/reports";
import { reportFiltersFrom, requireReport } from "@/lib/reports/access";

export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await context.params;
    const user = await requireReport(request, name);
    return ok(await runReport(name, user.campusId, reportFiltersFrom(request)));
  } catch (error) {
    return fail(error);
  }
}

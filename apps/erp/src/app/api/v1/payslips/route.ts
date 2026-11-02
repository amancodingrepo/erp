import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { flattenPayslips } from "@/lib/services/campus-spec-aliases";
import { listPayrollRuns } from "@/lib/services/payroll";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const runs = await listPayrollRuns(user.campusId);
    return ok({ data: flattenPayslips(runs) });
  } catch (error) {
    return fail(error);
  }
}

import { fail, ok } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { listReportCatalog } from "@/lib/reports";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    return ok({ data: listReportCatalog() });
  } catch (error) {
    return fail(error);
  }
}

import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { generatePayrollRun, listPayrollRuns } from "@/lib/services/payroll";

const bodySchema = z.object({
  year: z.number().int(),
  month: z.number().int(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const rows = await listPayrollRuns(user.campusId);
    return ok({
      data: rows.map((r) => ({
        id: r.id,
        year: r.year,
        month: r.month,
        status: r.status,
        slips: r.slips.map((s) => ({
          staffId: s.staffId,
          gross: s.gross.toString(),
          pf: s.pf.toString(),
          esi: s.esi.toString(),
          pt: s.pt.toString(),
          tds: s.tds.toString(),
          net: s.net.toString(),
        })),
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const body = bodySchema.parse(await readJson(request));
    const run = await generatePayrollRun(user.campusId, body);
    return created({
      id: run.id,
      year: run.year,
      month: run.month,
      slips: run.slips.map((s) => ({
        staffId: s.staffId,
        employeeId: s.staff.employeeId,
        gross: s.gross.toString(),
        pf: s.pf.toString(),
        esi: s.esi.toString(),
        pt: s.pt.toString(),
        tds: s.tds.toString(),
        net: s.net.toString(),
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

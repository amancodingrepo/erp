import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listStaffLoans, saveStaffLoan } from "@/lib/services/campus-hr-loans";

const bodySchema = z.object({
  staffId: z.string().min(1),
  amount: z.union([z.number(), z.string()]),
  issuedOn: z.string().optional(),
  dueOn: z.string().optional(),
  note: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    return ok({ data: await listStaffLoans(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await saveStaffLoan(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

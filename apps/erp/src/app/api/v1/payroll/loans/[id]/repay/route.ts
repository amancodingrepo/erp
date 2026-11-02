import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { repayCampusStaffLoan } from "@/lib/services/campus-hr-loans";

const bodySchema = z.object({
  amount: z.union([z.number(), z.string()]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    return ok(await repayCampusStaffLoan(user.campusId, id, body.amount));
  } catch (error) {
    return fail(error);
  }
}

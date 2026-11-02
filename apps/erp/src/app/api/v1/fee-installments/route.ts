import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listFeeInstallments,
  saveFeeInstallment,
} from "@/lib/services/campus-fee-installments";

const bodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    return ok({ data: await listFeeInstallments(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await saveFeeInstallment(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

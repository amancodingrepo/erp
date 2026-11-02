import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  createDepositSlip,
  listDepositSlips,
  listUndepositedPayments,
} from "@/lib/services/fees-deposit";

const bodySchema = z.object({
  slipNo: z.string().optional(),
  depositedAt: z.string().min(1),
  bankName: z.string().min(1),
  accountRef: z.string().optional(),
  note: z.string().optional(),
  paymentIds: z.array(z.string()).min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "view");
    const [data, undeposited] = await Promise.all([
      listDepositSlips(user.campusId),
      listUndepositedPayments(user.campusId),
    ]);
    return ok({ data, undeposited });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "fees",
      "collect",
      "collect",
    );
    const body = bodySchema.parse(await readJson(request));
    return created(await createDepositSlip(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

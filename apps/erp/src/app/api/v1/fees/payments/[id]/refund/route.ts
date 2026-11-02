import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { refundPayment } from "@/lib/services/fees";

const bodySchema = z.object({
  reason: z.string().min(1),
  amount: z.union([z.number(), z.string()]).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "fees",
      "collect",
      "collect",
    );
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const result = await refundPayment({
      campusId: user.campusId,
      paymentId: id,
      reason: body.reason,
      amount: body.amount,
    });
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "fees.payment.refund",
      entity: "Payment",
      entityId: id,
      after: {
        receiptNo: result.payment.receiptNo,
        refundReceiptNo: result.refund.receiptNo,
        amount: result.refund.amount.toString(),
        reason: body.reason,
      },
      ip: requestIp(request),
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

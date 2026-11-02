import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { cancelPayment } from "@/lib/services/fees";

const bodySchema = z.object({ reason: z.string().min(1) });

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
    const result = await cancelPayment({
      campusId: user.campusId,
      paymentId: id,
      reason: body.reason,
    });
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "fees.payment.cancel",
      entity: "Payment",
      entityId: id,
      after: {
        receiptNo: result.payment.receiptNo,
        contraReceiptNo: result.contra.receiptNo,
        reason: body.reason,
      },
      ip: requestIp(request),
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

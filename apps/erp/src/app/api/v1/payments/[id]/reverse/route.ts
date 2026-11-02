import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parsePaymentReverse } from "@/lib/services/campus-spec-aliases";
import { cancelPayment } from "@/lib/services/fees";

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
    const body = parsePaymentReverse(
      (await readJson(request).catch(() => ({}))) ?? {},
    );
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

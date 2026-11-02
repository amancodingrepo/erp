import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseChequeBounce } from "@/lib/services/campus-spec-aliases";
import { bounceCheque } from "@/lib/services/fees-cheque";

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
    const body = parseChequeBounce(await readJson(request));
    const result = await bounceCheque({
      campusId: user.campusId,
      paymentId: id,
      reason: body.reason,
    });
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "fees.payment.bounce",
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

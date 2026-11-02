import { requestIp, writeAudit } from "@/lib/audit";
import { validationError } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { payStudentFee } from "@/lib/services/fees-bulk";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "collect");
    const idempotency = request.headers.get("idempotency-key")?.trim();
    if (!idempotency) throw validationError({ "Idempotency-Key": "required" });
    const { id } = await context.params;
    const result = await payStudentFee({
      campusId: user.campusId,
      userId: user.id,
      studentId: id,
      idempotencyKey: idempotency,
      body: await readJson(request),
      partial: true,
    });
    if (!result.replayed) {
      await writeAudit({
        userId: user.id,
        campusId: user.campusId,
        action: "fees.payment.create",
        entity: "Payment",
        entityId: result.payment.id,
        after: {
          receiptNo: result.payment.receiptNo,
          invoiceId: result.invoice.id,
          amount: result.payment.amount.toString(),
          method: result.payment.method,
          studentId: id,
          partial: true,
        },
        ip: requestIp(request),
      });
    }
    const payload = {
      receiptNo: result.payment.receiptNo,
      paymentId: result.payment.id,
      invoice: result.invoice,
    };
    return result.replayed ? ok(payload) : created(payload);
  } catch (error) {
    return fail(error);
  }
}

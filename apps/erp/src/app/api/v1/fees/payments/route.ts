import { requestIp, writeAudit } from "@/lib/audit";
import { validationError } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { collectPayment, collectSchema, getReceipt } from "@/lib/services/fees";

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "fees",
      "collect",
      "collect",
    );
    const idempotency = request.headers.get("idempotency-key")?.trim();
    if (!idempotency) {
      throw validationError({ "Idempotency-Key": "required" });
    }
    const body = collectSchema.parse(await readJson(request));
    const result = await collectPayment({
      campusId: user.campusId,
      userId: user.id,
      idempotencyKey: idempotency,
      body,
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
          enrollmentId: body.enrollmentId,
          waivedFine: Boolean(body.waiveFine),
          waiveReason: body.waiveReason ?? null,
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

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "view");
    const receiptNo = new URL(request.url).searchParams.get("receiptNo");
    if (!receiptNo) return ok({ data: [] });
    const receipt = await getReceipt({ campusId: user.campusId, receiptNo });
    return ok(receipt.json);
  } catch (error) {
    return fail(error);
  }
}
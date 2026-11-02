import { fail, ok } from "@/lib/http";
import { forbidden } from "@/lib/errors";
import {
  fulfillGatewayPayment,
  merchantMatchingSignature,
  parseRazorpayCaptured,
} from "@/lib/services/gateway";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const merchant = await merchantMatchingSignature({
      provider: "razorpay",
      rawBody,
      razorpaySignature: request.headers.get("x-razorpay-signature"),
    });
    if (!merchant) throw forbidden("invalid webhook signature");
    const parsed = parseRazorpayCaptured(JSON.parse(rawBody) as never);
    if (!parsed) return ok({ ignored: true });
    const result = await fulfillGatewayPayment({
      providerOrderId: parsed.orderId,
      providerPaymentId: parsed.paymentId,
      amountPaise: parsed.amountPaise,
    });
    return ok({ ok: true, replayed: result.replayed });
  } catch (error) {
    return fail(error);
  }
}

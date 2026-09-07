import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { assertCanAccessStudent } from "@/lib/principal";
import { createFeeOrder } from "@/lib/services/gateway";

const bodySchema = z.object({
  invoiceId: z.string().min(1),
  studentId: z.string().min(1),
  provider: z.enum(["razorpay", "cashfree"]).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const body = bodySchema.parse(await readJson(request));
    assertCanAccessStudent(user, body.studentId);
    const order = await createFeeOrder({
      campusId: user.campusId,
      studentId: body.studentId,
      invoiceId: body.invoiceId,
      provider: body.provider,
    });
    return created(order);
  } catch (error) {
    return fail(error);
  }
}

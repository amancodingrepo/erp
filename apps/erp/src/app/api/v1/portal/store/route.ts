import { ActorType } from "@prisma/client";
import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { forbidden } from "@/lib/errors";
import {
  assertCanAccessStudent,
  principalFromRequest,
} from "@/lib/principal";
import { parentStoreDesk } from "@/lib/services/engagement";
import { createStoreCheckout } from "@/lib/services/gateway";

const bodySchema = z.object({
  studentId: z.string().optional(),
  itemId: z.string().min(1),
  qty: z.number().int().positive(),
  provider: z.enum(["razorpay", "cashfree"]).optional(),
});

function portalStudentId(
  user: Awaited<ReturnType<typeof principalFromRequest>>,
  requested?: string,
) {
  if (user.actorType === ActorType.STUDENT) return user.studentId ?? undefined;
  if (user.actorType === ActorType.GUARDIAN) {
    return requested && user.childIds?.includes(requested)
      ? requested
      : user.childIds?.[0];
  }
  return undefined;
}

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    if (user.actorType === ActorType.STAFF) throw forbidden("student or parent only");
    const requested = new URL(request.url).searchParams.get("studentId") ?? undefined;
    const studentId = portalStudentId(user, requested);
    if (!studentId) throw forbidden("forbidden");
    assertCanAccessStudent(user, studentId);
    return ok(await parentStoreDesk(user.campusId, studentId));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    if (user.actorType === ActorType.STAFF) throw forbidden("student or parent only");
    const body = bodySchema.parse(await readJson(request));
    const studentId = portalStudentId(user, body.studentId);
    if (!studentId) throw forbidden("forbidden");
    assertCanAccessStudent(user, studentId);
    const checkout = await createStoreCheckout({
      campusId: user.campusId,
      studentId,
      itemId: body.itemId,
      qty: body.qty,
      provider: body.provider,
    });
    return created(checkout);
  } catch (error) {
    return fail(error);
  }
}

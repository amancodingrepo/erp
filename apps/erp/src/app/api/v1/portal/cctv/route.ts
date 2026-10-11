import { ActorType } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import { forbidden } from "@/lib/errors";
import {
  assertCanAccessStudent,
  principalFromRequest,
} from "@/lib/principal";
import { parentCctvDesk } from "@/lib/services/campus-front";

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
    return ok(await parentCctvDesk(user.campusId, studentId));
  } catch (error) {
    return fail(error);
  }
}

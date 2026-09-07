import { ActorType } from "@prisma/client";
import { z } from "zod";
import { forbidden } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import {
  assertCanAccessStudent,
  principalFromRequest,
} from "@/lib/principal";
import {
  listOpenFeedbackAssignments,
  submitFeedback,
} from "@/lib/services/feedback";

const bodySchema = z.object({
  assignmentId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
  studentId: z.string().optional(),
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
    const rows = await listOpenFeedbackAssignments(user.campusId);
    return ok({
      data: rows.map((a) => ({
        id: a.id,
        name: a.form.name,
        fields: a.form.fields,
      })),
    });
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
    return created(
      await submitFeedback(user.campusId, {
        assignmentId: body.assignmentId,
        respondentId: studentId,
        answers: body.answers,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

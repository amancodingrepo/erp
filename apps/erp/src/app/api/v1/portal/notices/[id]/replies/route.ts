import { ActorType } from "@prisma/client";
import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { forbidden } from "@/lib/errors";
import {
  assertCanAccessStudent,
  principalFromRequest,
} from "@/lib/principal";
import { listNoticeReplies, saveNoticeReply } from "@/lib/services/diary";

const bodySchema = z.object({
  body: z.string().min(1),
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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    if (user.actorType === ActorType.STAFF) throw forbidden("student or parent only");
    const { id } = await context.params;
    return ok({ data: await listNoticeReplies(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    if (user.actorType === ActorType.STAFF) throw forbidden("student or parent only");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const studentId = portalStudentId(user, body.studentId);
    if (!studentId) throw forbidden("forbidden");
    assertCanAccessStudent(user, studentId);
    return created(
      await saveNoticeReply(user.campusId, {
        noticeId: id,
        body: body.body,
        authorRole: "parent",
        studentId,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

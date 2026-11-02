import { ActorType } from "@prisma/client";
import { z } from "zod";
import { forbidden } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import {
  assertCanAccessStudent,
  principalFromRequest,
} from "@/lib/principal";
import {
  listExamForms,
  listOpenExamFormWindows,
  submitExamForm,
} from "@/lib/services/exam-forms";

const bodySchema = z.object({
  windowId: z.string().min(1),
  subjectIds: z.array(z.string().min(1)).min(1),
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
    const [windows, mine] = await Promise.all([
      listOpenExamFormWindows(user.campusId),
      listExamForms(user.campusId, { studentId }),
    ]);
    return ok({
      data: windows.map((w) => ({
        id: w.id,
        kind: w.kind,
        opensAt: w.opensAt,
        closesAt: w.closesAt,
        feeAmount: w.feeAmount.toString(),
        examGroup: {
          id: w.examGroup.id,
          name: w.examGroup.name,
          subjects: w.examGroup.exams.flatMap((e) =>
            e.subjects.map((s) => ({ id: s.id, exam: e.name })),
          ),
        },
      })),
      mine: mine.map((f) => ({
        id: f.id,
        kind: f.kind,
        examGroup: f.examGroup.name,
        feeInvoiceId: f.feeInvoiceId,
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
      await submitExamForm(user.campusId, {
        windowId: body.windowId,
        studentId,
        subjectIds: body.subjectIds,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

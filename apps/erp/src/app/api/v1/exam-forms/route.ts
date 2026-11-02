import { ExamFormKind } from "@prisma/client";
import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listExamForms, submitExamForm } from "@/lib/services/exam-forms";

const bodySchema = z.object({
  windowId: z.string().min(1),
  studentId: z.string().min(1),
  subjectIds: z.array(z.string().min(1)).min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "view");
    const url = new URL(request.url);
    const kindParam = url.searchParams.get("kind");
    const kind =
      kindParam === "ATKT" || kindParam === "REVAL"
        ? (kindParam as ExamFormKind)
        : undefined;
    const studentId = url.searchParams.get("studentId") ?? undefined;
    const rows = await listExamForms(user.campusId, { kind, studentId });
    return ok({
      data: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        subjectIds: r.subjectIds,
        feeInvoiceId: r.feeInvoiceId,
        feeAmount: r.window.feeAmount.toString(),
        createdAt: r.createdAt,
        student: {
          id: r.student.id,
          admissionNo: r.student.admissionNo,
          name: [r.student.firstName, r.student.lastName].filter(Boolean).join(" "),
        },
        examGroup: r.examGroup,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await submitExamForm(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

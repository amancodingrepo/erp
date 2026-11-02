import { NextResponse } from "next/server";
import { validationError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { assertCanAccessStudent, requireApiPermission } from "@/lib/principal";
import { studentAdmitCard } from "@/lib/services/exams";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const { id } = await context.params;
    assertCanAccessStudent(user, id);
    const examId = new URL(request.url).searchParams.get("examId");
    if (!examId) throw validationError({ examId: "required" });
    const result = await studentAdmitCard({
      campusId: user.campusId,
      studentId: id,
      examId,
    });
    if (new URL(request.url).searchParams.get("format") === "pdf") {
      return new NextResponse(Buffer.from(result.pdf), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="admit-card-${id}.pdf"`,
        },
      });
    }
    return ok(result.json);
  } catch (error) {
    return fail(error);
  }
}

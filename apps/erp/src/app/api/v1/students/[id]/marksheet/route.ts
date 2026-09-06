import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http";
import { assertCanAccessStudent, requireApiPermission } from "@/lib/principal";
import { studentMarksheet } from "@/lib/services/exams";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const { id } = await context.params;
    assertCanAccessStudent(user, id);
    const params = new URL(request.url).searchParams;
    const result = await studentMarksheet({
      campusId: user.campusId,
      studentId: id,
      examId: params.get("examId") ?? undefined,
      examGroupId: params.get("examGroupId") ?? undefined,
    });
    if (params.get("format") === "pdf") {
      return new NextResponse(Buffer.from(result.pdf), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="marksheet-${id}.pdf"`,
        },
      });
    }
    return ok(result.json);
  } catch (error) {
    return fail(error);
  }
}

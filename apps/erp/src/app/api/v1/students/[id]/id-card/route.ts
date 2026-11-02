import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http";
import { assertCanAccessStudent, requireApiPermission } from "@/lib/principal";
import { studentIdCardPdf } from "@/lib/services/print-docs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    assertCanAccessStudent(user, id);
    const result = await studentIdCardPdf(user.campusId, id);
    if (new URL(request.url).searchParams.get("format") === "pdf") {
      return new NextResponse(Buffer.from(result.pdf), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="id-card-${result.admissionNo}.pdf"`,
        },
      });
    }
    return ok({ admissionNo: result.admissionNo, pdfBytes: result.pdf.length });
  } catch (error) {
    return fail(error);
  }
}

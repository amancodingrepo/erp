import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http";
import { assertCanAccessStudent, requireApiPermission } from "@/lib/principal";
import { studentCertificatePdf } from "@/lib/services/print-docs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    assertCanAccessStudent(user, id);
    const templateId =
      new URL(request.url).searchParams.get("templateId") ?? undefined;
    const result = await studentCertificatePdf(user.campusId, id, templateId);
    if (new URL(request.url).searchParams.get("format") === "pdf") {
      return new NextResponse(Buffer.from(result.pdf), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="certificate-${id}.pdf"`,
        },
      });
    }
    return ok({ title: result.title, pdfBytes: result.pdf.length });
  } catch (error) {
    return fail(error);
  }
}

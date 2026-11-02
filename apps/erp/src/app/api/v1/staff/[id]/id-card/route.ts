import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { staffIdCardPdf } from "@/lib/services/print-docs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    const { id } = await context.params;
    const result = await staffIdCardPdf(user.campusId, id);
    if (new URL(request.url).searchParams.get("format") === "pdf") {
      return new NextResponse(Buffer.from(result.pdf), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="staff-id-${result.employeeId}.pdf"`,
        },
      });
    }
    return ok({ employeeId: result.employeeId, pdfBytes: result.pdf.length });
  } catch (error) {
    return fail(error);
  }
}

import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { campusLetterhead } from "@/lib/letterhead";
import { buildCertificatePdf } from "@/lib/pdf/id-card";
import { payslipLines } from "@/lib/services/campus-later";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const { id } = await context.params;
    const slip = await prisma.payrollSlip.findFirst({
      where: { id, run: { campusId: user.campusId } },
      include: {
        staff: { select: { firstName: true, lastName: true, employeeId: true } },
        run: true,
      },
    });
    if (!slip) throw notFound("payslip");
    const letter = await campusLetterhead(user.campusId);
    const lines = payslipLines({
      campusName: letter.campusName,
      staffName: [slip.staff.firstName, slip.staff.lastName]
        .filter(Boolean)
        .join(" "),
      employeeId: slip.staff.employeeId,
      year: slip.run.year,
      month: slip.run.month,
      gross: slip.gross.toString(),
      pf: slip.pf.toString(),
      esi: slip.esi.toString(),
      pt: slip.pt.toString(),
      tds: slip.tds.toString(),
      net: slip.net.toString(),
    });
    const pdf = buildCertificatePdf({
      campusName: letter.campusName,
      header: letter.header,
      footer: letter.footer,
      title: "Payslip",
      lines,
    });
    if (new URL(request.url).searchParams.get("format") === "pdf") {
      return new NextResponse(Buffer.from(pdf), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="payslip-${slip.staff.employeeId}.pdf"`,
        },
      });
    }
    return ok({
      id: slip.id,
      employeeId: slip.staff.employeeId,
      lines,
      pdfBytes: pdf.length,
    });
  } catch (error) {
    return fail(error);
  }
}

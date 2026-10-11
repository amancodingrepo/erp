import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { parseReportFilters, pdfFilename, runReport, toPdf } from "@/lib/reports";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const { key } = await context.params;
    const params = new URL(request.url).searchParams;
    const report = await runReport(key, user.campusId, parseReportFilters({
      classId: params.get("classId"),
      sectionId: params.get("sectionId"),
      from: params.get("from"),
      to: params.get("to"),
      feeGroupId: params.get("feeGroupId"),
    }));
    const body = toPdf(report);
    return new NextResponse(Buffer.from(body), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${pdfFilename(key)}"`,
      },
    });
  } catch (error) {
    return fail(error);
  }
}

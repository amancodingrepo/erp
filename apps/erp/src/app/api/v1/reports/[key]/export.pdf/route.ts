import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { pdfFilename, runReport, toPdf } from "@/lib/reports";
import { reportFiltersFrom, requireReport } from "@/lib/reports/access";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await context.params;
    const user = await requireReport(request, key);
    const report = await runReport(key, user.campusId, reportFiltersFrom(request));
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

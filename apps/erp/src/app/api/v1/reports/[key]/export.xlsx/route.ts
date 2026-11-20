import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { runReport, toXlsx, xlsxFilename } from "@/lib/reports";
import { reportFiltersFrom, requireReport } from "@/lib/reports/access";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await context.params;
    const user = await requireReport(request, key);
    const report = await runReport(key, user.campusId, reportFiltersFrom(request));
    const body = toXlsx(report);
    return new NextResponse(Buffer.from(body), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${xlsxFilename(key)}"`,
      },
    });
  } catch (error) {
    return fail(error);
  }
}

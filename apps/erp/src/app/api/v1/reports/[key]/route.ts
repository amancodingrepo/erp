import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http";
import { reportFiltersFrom, requireReport } from "@/lib/reports/access";
import {
  pdfFilename,
  runReport,
  toCsv,
  toPdf,
  toXlsx,
  xlsxFilename,
} from "@/lib/reports";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await context.params;
    const user = await requireReport(request, key);
    const report = await runReport(key, user.campusId, reportFiltersFrom(request));
    const params = new URL(request.url).searchParams;
    if (params.get("format") === "csv") {
      return new NextResponse(toCsv(report), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${key}.csv"`,
        },
      });
    }
    if (params.get("format") === "xlsx") {
      return new NextResponse(Buffer.from(toXlsx(report)), {
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename="${xlsxFilename(key)}"`,
        },
      });
    }
    if (params.get("format") === "pdf") {
      return new NextResponse(Buffer.from(toPdf(report)), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${pdfFilename(key)}"`,
        },
      });
    }
    return ok(report);
  } catch (error) {
    return fail(error);
  }
}

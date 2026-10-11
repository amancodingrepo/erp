import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { parseReportFilters, runReport, toCsv, toXlsx, xlsxFilename } from "@/lib/reports";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const { key } = await context.params;
    const params = new URL(request.url).searchParams;
    const report = await runReport(
      key,
      user.campusId,
      parseReportFilters({
        classId: params.get("classId"),
        sectionId: params.get("sectionId"),
        from: params.get("from"),
        to: params.get("to"),
        feeGroupId: params.get("feeGroupId"),
      }),
    );
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
    return ok(report);
  } catch (error) {
    return fail(error);
  }
}

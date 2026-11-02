import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { parseReportFilters, runReport, toXlsx, xlsxFilename } from "@/lib/reports";

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

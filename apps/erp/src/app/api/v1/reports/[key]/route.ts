import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { runReport, toCsv } from "@/lib/reports";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const { key } = await context.params;
    const params = new URL(request.url).searchParams;
    const report = await runReport(key, user.campusId, {
      classId: params.get("classId") ?? undefined,
      sectionId: params.get("sectionId") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      feeGroupId: params.get("feeGroupId") ?? undefined,
    });
    if (params.get("format") === "csv") {
      return new NextResponse(toCsv(report), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${key}.csv"`,
        },
      });
    }
    return ok(report);
  } catch (error) {
    return fail(error);
  }
}

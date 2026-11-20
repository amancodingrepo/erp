import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http";
import { platformActivity, requirePlatformDesk } from "@/lib/platform-desk";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

export async function GET(request: Request) {
  try {
    await requirePlatformDesk(request, "view");
    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId") || undefined;
    const q = url.searchParams.get("q") || undefined;
    const rows = await platformActivity(orgId, q);
    if (url.searchParams.get("format") === "csv") {
      const header = ["when", "action", "entity", "school", "campus", "actor"];
      const lines = [
        header.join(","),
        ...rows.map((row) =>
          [row.createdAt.toISOString(), row.action, row.entity, row.school, row.campus, row.actor].map(csvCell).join(","),
        ),
      ];
      return new NextResponse(lines.join("\n"), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": "attachment; filename=\"activity.csv\"",
        },
      });
    }
    return ok({ data: rows });
  } catch (error) {
    return fail(error);
  }
}

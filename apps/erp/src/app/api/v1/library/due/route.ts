import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listOpenIssues, overdueIssues } from "@/lib/services/library";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const rows = overdueIssues(await listOpenIssues(user.campusId));
    return ok({
      data: rows.map((row) => ({
        id: row.id,
        title: row.book.title,
        memberNo: row.member.memberNo,
        dueOn: row.dueOn,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

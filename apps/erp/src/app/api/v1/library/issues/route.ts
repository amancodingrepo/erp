import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { issueBook, listOpenIssues } from "@/lib/services/library";

const bodySchema = z.object({
  bookId: z.string().min(1),
  memberId: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const rows = await listOpenIssues(user.campusId);
    return ok({
      data: rows.map((r) => ({
        id: r.id,
        title: r.book.title,
        memberNo: r.member.memberNo,
        dueOn: r.dueOn,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await issueBook(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

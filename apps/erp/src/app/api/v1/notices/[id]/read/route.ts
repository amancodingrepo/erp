import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { markNoticeRead } from "@/lib/services/diary";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    const { id } = await context.params;
    const raw = await request.text();
    let studentId: string | undefined;
    if (raw) {
      try {
        studentId = (JSON.parse(raw) as { studentId?: string }).studentId;
      } catch {
        studentId = undefined;
      }
    }
    return ok(await markNoticeRead(user, id, studentId));
  } catch (error) {
    return fail(error);
  }
}

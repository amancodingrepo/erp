import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { studentLedger } from "@/lib/services/fees";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "view");
    const { id } = await context.params;
    const sessionId =
      new URL(request.url).searchParams.get("sessionId") ?? undefined;
    return ok(
      await studentLedger({
        campusId: user.campusId,
        studentId: id,
        sessionId,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

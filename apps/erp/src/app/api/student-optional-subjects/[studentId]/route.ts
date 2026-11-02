import { fail, ok, readJson } from "@/lib/http";
import { requireStaff, saveOptionalSubjects } from "@/lib/school-world-bridge";

export async function PUT(request: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { studentId } = await context.params;
    const body = await readJson<Record<string, unknown>>(request);
    return ok(await saveOptionalSubjects(user.campusId, decodeURIComponent(studentId), body));
  } catch (error) {
    return fail(error);
  }
}

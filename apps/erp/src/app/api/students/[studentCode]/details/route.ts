import { fail, ok, readJson } from "@/lib/http";
import { requireStaff, saveStudentDetails } from "@/lib/school-world-bridge";

export async function PUT(request: Request, context: { params: Promise<{ studentCode: string }> }) {
  try {
    const user = await requireStaff(request);
    const { studentCode } = await context.params;
    const body = await readJson<Record<string, unknown>>(request);
    return ok({ student: await saveStudentDetails(user.campusId, decodeURIComponent(studentCode), body) });
  } catch (error) {
    return fail(error);
  }
}

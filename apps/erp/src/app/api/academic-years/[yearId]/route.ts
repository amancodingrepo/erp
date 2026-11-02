import { fail, ok, readJson } from "@/lib/http";
import { requireSchoolAdmin, saveAcademicYear } from "@/lib/school-world-bridge";

export async function PATCH(request: Request, context: { params: Promise<{ yearId: string }> }) {
  try {
    const user = await requireSchoolAdmin(request);
    const { yearId } = await context.params;
    const body = await readJson<Record<string, unknown>>(request);
    return ok({ academicYear: await saveAcademicYear(user.campusId, body, decodeURIComponent(yearId)) });
  } catch (error) {
    return fail(error);
  }
}

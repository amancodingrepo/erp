import { created, fail, readJson } from "@/lib/http";
import { requireSchoolAdmin, saveAcademicYear } from "@/lib/school-world-bridge";

export async function POST(request: Request) {
  try {
    const user = await requireSchoolAdmin(request);
    const body = await readJson<Record<string, unknown>>(request);
    return created({ academicYear: await saveAcademicYear(user.campusId, body) });
  } catch (error) {
    return fail(error);
  }
}

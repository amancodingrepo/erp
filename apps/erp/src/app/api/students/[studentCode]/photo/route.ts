import { fail, ok, readJson } from "@/lib/http";
import { requireStaff, saveStudentDetails } from "@/lib/school-world-bridge";

export async function PUT(request: Request, context: { params: Promise<{ studentCode: string }> }) {
  try {
    const user = await requireStaff(request);
    const { studentCode } = await context.params;
    const body = await readJson<{ photoDataUrl?: string }>(request);
    const student = await saveStudentDetails(user.campusId, decodeURIComponent(studentCode), {
      student: { photoDataUrl: body.photoDataUrl || "" },
    });
    return ok({ student });
  } catch (error) {
    return fail(error);
  }
}

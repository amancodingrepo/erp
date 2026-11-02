import { fail, ok } from "@/lib/http";
import { optionalSubjectRoster, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    const url = new URL(request.url);
    return ok(await optionalSubjectRoster(user.campusId, url.searchParams.get("classId") || "", url.searchParams.get("academicYear") || ""));
  } catch (error) {
    return fail(error);
  }
}

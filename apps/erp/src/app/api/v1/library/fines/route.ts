import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  libraryFineDesk,
  libraryFinePerDay,
  listChargedFines,
  listOpenIssues,
  overdueIssues,
} from "@/lib/services/library";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const [charged, open, perDay] = await Promise.all([
      listChargedFines(user.campusId),
      listOpenIssues(user.campusId),
      libraryFinePerDay(user.campusId),
    ]);
    return ok({
      data: libraryFineDesk(charged, overdueIssues(open), perDay),
    });
  } catch (error) {
    return fail(error);
  }
}

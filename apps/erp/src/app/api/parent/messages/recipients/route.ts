import { forbidden } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { requireCampusUser } from "@/lib/school-world-bridge";
import { parentContactableStaff } from "@/lib/school-world-messaging";

export async function GET(request: Request) {
  try {
    const user = await requireCampusUser(request);
    if (user.actorType !== "GUARDIAN") throw forbidden("Only parent accounts can use Contact Staff.");
    const people = await parentContactableStaff(user.campusId);
    // userId is internal; the parent only needs who they can pick.
    return ok({ people: people.map(({ personId, fullName, categoryName }) => ({ personId, fullName, categoryName })) });
  } catch (error) {
    return fail(error);
  }
}

import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  parseRollAssign,
  resolveRollTarget,
} from "@/lib/services/campus-spec-aliases";
import { generateRollNumbers } from "@/lib/services/students";

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const parsed = parseRollAssign(await readJson(request));
    const target = await resolveRollTarget(user.campusId, parsed);
    return ok(
      await generateRollNumbers({
        campusId: user.campusId,
        classId: target.classId,
        sectionId: target.sectionId,
        startFrom: parsed.startFrom,
        arrangement: parsed.arrangement,
        sort: parsed.sort,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

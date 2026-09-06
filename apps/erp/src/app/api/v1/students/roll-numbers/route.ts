import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  generateRollNumbers,
  rollNumbersSchema,
} from "@/lib/services/students";

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const body = rollNumbersSchema.parse(await readJson(request));
    return ok(
      await generateRollNumbers({
        campusId: user.campusId,
        classId: body.classId,
        sectionId: body.sectionId,
        startFrom: body.startFrom,
        arrangement: body.arrangement,
        sort: body.sort,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

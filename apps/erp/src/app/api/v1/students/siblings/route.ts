import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { siblingsFor, writeSiblingGroup } from "@/lib/services/engagement";

const bodySchema = z.object({
  studentIds: z.array(z.string().min(1)).min(2),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "view",
    );
    const studentId = new URL(request.url).searchParams.get("studentId");
    if (!studentId) return ok({ data: [] });
    return ok(await siblingsFor(user.campusId, studentId));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const body = bodySchema.parse(await readJson(request));
    return created(await writeSiblingGroup(user.campusId, body.studentIds));
  } catch (error) {
    return fail(error);
  }
}

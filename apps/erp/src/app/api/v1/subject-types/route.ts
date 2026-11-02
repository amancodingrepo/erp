import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listSubjectTypes,
  saveSubjectType,
} from "@/lib/services/academics-masters";

const bodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "subject", "view");
    return ok({ data: await listSubjectTypes(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "subject",
      "create",
    );
    const body = bodySchema.parse(await readJson(request));
    return created(await saveSubjectType(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

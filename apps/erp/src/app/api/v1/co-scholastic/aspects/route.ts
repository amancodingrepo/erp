import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listCoScholasticAspects,
  saveCoScholasticAspect,
} from "@/lib/services/campus-coscholastic";

const bodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    return ok({ data: await listCoScholasticAspects(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await saveCoScholasticAspect(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

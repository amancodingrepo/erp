import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { checkInVisitor, listVisitors } from "@/lib/services/front-office";

const bodySchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  purpose: z.string().optional(),
  toMeet: z.string().optional(),
  note: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await listVisitors(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await checkInVisitor(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

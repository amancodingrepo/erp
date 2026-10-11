import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listWeedout, saveWeedout } from "@/lib/services/library";

const bodySchema = z.object({
  bookId: z.string().min(1),
  qty: z.coerce.number().int(),
  reason: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await listWeedout(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await saveWeedout(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

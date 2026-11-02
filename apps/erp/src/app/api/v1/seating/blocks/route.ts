import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createSeatingBlock, listSeatingBlocks } from "@/lib/services/seating";

const bodySchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "view");
    return ok({ data: await listSeatingBlocks(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await createSeatingBlock(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

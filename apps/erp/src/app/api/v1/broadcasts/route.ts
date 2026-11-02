import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listBroadcastLists,
  saveBroadcastList,
} from "@/lib/services/directory";

const bodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  studentIds: z.array(z.string()).optional(),
  staffIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await listBroadcastLists(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await saveBroadcastList(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

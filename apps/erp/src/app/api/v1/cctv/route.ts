import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listCctvCameras, saveCctvCamera } from "@/lib/services/campus-front";

const bodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  room: z.string().optional(),
  url: z.string().url(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await listCctvCameras(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await saveCctvCamera(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

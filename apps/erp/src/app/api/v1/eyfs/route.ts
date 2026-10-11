import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  deleteEyfsObservation,
  listEyfs,
  saveEyfsObservation,
} from "@/lib/services/campus-eyfs";

const bodySchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1),
  areaId: z.string().min(1),
  note: z.string().min(1),
  url: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const studentId =
      new URL(request.url).searchParams.get("studentId") ?? undefined;
    return ok({ data: await listEyfs(user.campusId, studentId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await saveEyfsObservation(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const id = new URL(request.url).searchParams.get("id") ?? "";
    return ok(await deleteEyfsObservation(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

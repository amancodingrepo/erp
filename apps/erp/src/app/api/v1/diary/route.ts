import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  DIARY_CHANNELS,
  DIARY_KINDS,
  deleteDiaryEntry,
  listDiary,
  saveDiaryEntry,
} from "@/lib/services/campus-diary";

const bodySchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1),
  kind: z.enum(DIARY_KINDS),
  channel: z.enum(DIARY_CHANNELS).optional(),
  url: z.string().optional(),
  caption: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const studentId =
      new URL(request.url).searchParams.get("studentId") ?? undefined;
    return ok({ data: await listDiary(user.campusId, studentId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await saveDiaryEntry(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const id = new URL(request.url).searchParams.get("id") ?? "";
    return ok(await deleteDiaryEntry(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

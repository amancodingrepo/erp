import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listClassTeacherDesk,
  writeClassTeacher,
} from "@/lib/services/session-context";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "view",
    );
    return ok(await listClassTeacherDesk(user.campusId));
  } catch (error) {
    return fail(error);
  }
}

const bodySchema = z.object({
  sectionId: z.string().min(1),
  staffId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "edit",
    );
    const body = bodySchema.parse(await readJson(request));
    await writeClassTeacher(
      user.campusId,
      body.sectionId,
      body.staffId ?? null,
    );
    return ok(await listClassTeacherDesk(user.campusId));
  } catch (error) {
    return fail(error);
  }
}

import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listClassDeskTeachers,
  saveClassDeskTeachers,
} from "@/lib/services/campus-class-desk";

const bodySchema = z.object({
  staffId: z.string().nullable().optional(),
  teachers: z
    .array(
      z.object({
        sectionId: z.string(),
        staffId: z.string().nullable().optional(),
      }),
    )
    .optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    const { id } = await context.params;
    return ok({ data: await listClassDeskTeachers(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "create");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    let assignments: unknown = body.teachers;
    if (assignments === undefined && body.staffId !== undefined) {
      const desk = await listClassDeskTeachers(user.campusId, id);
      assignments = desk.sections.map((section) => ({
        sectionId: section.id,
        staffId: body.staffId,
      }));
    }
    return ok({
      data: await saveClassDeskTeachers(user.campusId, id, assignments ?? []),
    });
  } catch (error) {
    return fail(error);
  }
}

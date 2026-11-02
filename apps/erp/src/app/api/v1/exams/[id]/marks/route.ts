import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { loadExamSubject, saveMarks } from "@/lib/services/exams";

const putSchema = z.object({
  entries: z.array(
    z.object({
      studentId: z.string().optional(),
      rosterId: z.string().optional(),
      marks: z.union([z.number(), z.string()]).nullable().optional(),
      isAbsent: z.boolean().optional(),
    }),
  ),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const { id } = await context.params;
    return ok(await loadExamSubject(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "edit");
    const { id } = await context.params;
    const body = putSchema.parse(await readJson(request));
    return ok(
      await saveMarks({
        user,
        examSubjectId: id,
        entries: body.entries,
        request,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

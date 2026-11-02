import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listClassDeskSubjects,
  saveClassDeskSubjects,
} from "@/lib/services/campus-class-desk";
import { viewingSessionId } from "@/lib/services/session-context";

const bodySchema = z.object({
  subjectIds: z.array(z.string()).optional(),
  offerings: z
    .array(
      z.object({
        subjectId: z.string(),
        sectionId: z.string().nullable().optional(),
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
    const user = await requireApiPermission(request, "academics", "subject", "view");
    const { id } = await context.params;
    const sessionId = await viewingSessionId(request, user);
    return ok(await listClassDeskSubjects(user.campusId, id, sessionId));
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "subject",
      "create",
    );
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const sessionId = await viewingSessionId(request, user);
    const input = body.offerings ?? body.subjectIds ?? [];
    return ok(await saveClassDeskSubjects(user.campusId, id, input, sessionId));
  } catch (error) {
    return fail(error);
  }
}

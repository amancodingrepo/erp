import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createNaacTask, listNaacTasks } from "@/lib/services/naac";

const bodySchema = z.object({
  criterionId: z.string().optional(),
  criterionNumber: z.number().int().min(1).max(7).optional(),
  title: z.string().min(1),
  keyIndicator: z.string().optional(),
  dueOn: z.string().optional(),
  evidenceRequired: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const rows = await listNaacTasks(user.campusId);
    return ok({
      data: rows.map((t) => ({
        id: t.id,
        title: t.title,
        keyIndicator: t.keyIndicator,
        dueOn: t.dueOn,
        evidenceRequired: t.evidenceRequired,
        criterion: { id: t.criterion.id, number: t.criterion.number, title: t.criterion.title },
        evidence: t.evidence.length,
        assignments: t.assignments.map((a) => ({
          id: a.id,
          status: a.status,
          staff: [a.staff.firstName, a.staff.lastName].filter(Boolean).join(" "),
        })),
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await createNaacTask(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

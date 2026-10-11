import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listConcessions,
  saveConcession,
} from "@/lib/services/fees-concessions";

const bodySchema = z.object({
  discountId: z.string().min(1),
  note: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const { id } = await context.params;
    return ok({ data: await listConcessions(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "collect");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    return created(
      await saveConcession(user.campusId, {
        studentId: id,
        discountId: body.discountId,
        note: body.note,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

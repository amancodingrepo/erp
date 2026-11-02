import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { setIndirectPo } from "@/lib/services/copo";

const bodySchema = z.object({
  programOutcomeId: z.string().min(1),
  percent: z.union([z.number(), z.string()]),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "create");
    const body = bodySchema.parse(await readJson(request));
    const row = await setIndirectPo(user.campusId, body);
    return created({ ...row, percent: row.percent.toString() });
  } catch (error) {
    return fail(error);
  }
}

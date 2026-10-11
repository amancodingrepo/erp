import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { saveClassOrder } from "@/lib/services/campus-class-order";

const bodySchema = z.object({
  classIds: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "create",
    );
    const body = bodySchema.parse(await readJson(request));
    return ok({ data: await saveClassOrder(user.campusId, body.classIds) });
  } catch (error) {
    return fail(error);
  }
}

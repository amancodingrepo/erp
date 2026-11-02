import { PayElementKind } from "@prisma/client";
import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createPayElement, listPayElements } from "@/lib/services/payroll";

const bodySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  kind: z.nativeEnum(PayElementKind),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const rows = await listPayElements(user.campusId);
    return ok({ data: rows });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await createPayElement(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listPrincipals, savePrincipal } from "@/lib/services/campus-branch";

const bodySchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1),
  staffId: z.string().min(1),
  signatureUrl: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    return ok({ data: await listPrincipals(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await savePrincipal(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

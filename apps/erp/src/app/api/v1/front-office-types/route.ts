import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { addFrontOfficeType, listFrontOfficeTypes } from "@/lib/services/front-office";

const bodySchema = z.object({
  kind: z.enum(["purpose", "source", "complaint"]),
  name: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const kind = new URL(request.url).searchParams.get("kind") ?? undefined;
    return ok({ data: await listFrontOfficeTypes(user.campusId, kind ?? undefined) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await addFrontOfficeType(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

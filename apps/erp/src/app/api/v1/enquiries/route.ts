import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createEnquiry, listEnquiries } from "@/lib/services/front-office";

const bodySchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  source: z.string().optional(),
  classInterested: z.string().optional(),
  followUpOn: z.string().optional(),
  remarks: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    return ok({ data: await listEnquiries(user.campusId, status ?? undefined) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await createEnquiry(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

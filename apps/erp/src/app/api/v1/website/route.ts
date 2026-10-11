import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { getWebsite, saveWebsite } from "@/lib/services/campus-branch";

const bodySchema = z.object({
  published: z.boolean().optional(),
  tagline: z.string().optional(),
  about: z.string().optional(),
  logoUrl: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "view");
    return ok(await getWebsite(user.campusId));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "edit");
    const body = bodySchema.parse(await readJson(request));
    return ok(await saveWebsite(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

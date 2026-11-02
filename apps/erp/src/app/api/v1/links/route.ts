import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listExternalLinks,
  saveExternalLink,
} from "@/lib/services/campus-branch";

const bodySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  url: z.string().url(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "view");
    return ok({ data: await listExternalLinks(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await saveExternalLink(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

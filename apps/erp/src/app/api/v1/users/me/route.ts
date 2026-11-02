import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { saveOwnProfile } from "@/lib/services/campus-user-passwords";

const patchSchema = z.object({
  email: z.string().optional().nullable(),
});

export async function PATCH(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const body = patchSchema.parse(await readJson(request));
    return ok(await saveOwnProfile(user.id, body));
  } catch (error) {
    return fail(error);
  }
}

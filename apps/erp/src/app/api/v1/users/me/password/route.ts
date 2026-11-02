import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { changeOwnPassword } from "@/lib/services/campus-user-passwords";

const bodySchema = z.object({
  current: z.string().min(1),
  next: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const body = bodySchema.parse(await readJson(request));
    return ok(await changeOwnPassword(user.id, body));
  } catch (error) {
    return fail(error);
  }
}

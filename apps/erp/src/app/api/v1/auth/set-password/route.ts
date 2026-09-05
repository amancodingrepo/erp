import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { consumePasswordReset } from "@/lib/password-reset";

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await readJson(request));
    await consumePasswordReset(body.token, body.password);
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

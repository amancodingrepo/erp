import { z } from "zod";
import { prisma } from "@/lib/db";
import { unauthenticated, validationError } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/password";
import { principalFromRequest } from "@/lib/principal";

const bodySchema = z.object({
  current: z.string().min(1),
  next: z.string().min(8),
});

export async function PATCH(request: Request) {
  try {
    const principal = await principalFromRequest(request);
    const body = bodySchema.parse(await readJson(request));
    const user = await prisma.user.findUnique({ where: { id: principal.id } });
    if (!user) throw unauthenticated();
    const matches = await verifyPassword(body.current, user.passwordHash);
    if (!matches) {
      throw validationError({ current: "incorrect password" });
    }
    const passwordHash = await hashPassword(body.next);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

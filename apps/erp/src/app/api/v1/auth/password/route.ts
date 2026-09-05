import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { unauthenticated, validationError } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
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
    const matches = await bcrypt.compare(body.current, user.passwordHash);
    if (!matches) {
      throw validationError({ current: "incorrect password" });
    }
    const passwordHash = await bcrypt.hash(body.next, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

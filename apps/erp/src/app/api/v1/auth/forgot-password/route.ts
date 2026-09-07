import { ActorType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimited } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { issuePasswordReset } from "@/lib/password-reset";
import { hitLoginRateLimit } from "@/lib/rate-limit-db";

const PORTAL_ACTOR: Record<string, ActorType> = {
  staff: ActorType.STAFF,
  student: ActorType.STUDENT,
  parent: ActorType.GUARDIAN,
};

const bodySchema = z.object({
  username: z.string().min(1),
  portal: z.enum(["staff", "student", "parent"]).default("staff"),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    const body = bodySchema.parse(await readJson(request));
    if (await hitLoginRateLimit(`forgot:${body.username}:${ip}`, 5)) {
      throw rateLimited();
    }
    const actorType = PORTAL_ACTOR[body.portal];
    const user = await prisma.user.findFirst({
      where: { username: body.username, actorType, isActive: true },
    });
    if (user) {
      await issuePasswordReset(user.id);
    }
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

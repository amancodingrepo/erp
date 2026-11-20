import { z } from "zod";
import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth-cookie";
import { requestIp, writeAudit } from "@/lib/audit";
import { signAuthToken } from "@/lib/auth-token";
import { campusSummary } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { loadPrincipal } from "@/lib/principal";
import { requirePlatformDesk } from "@/lib/platform-desk";

const bodySchema = z.object({ campusId: z.string().min(1) });
const SUPPORT_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const user = await requirePlatformDesk(request, "edit");
    const body = bodySchema.parse(await readJson(request));
    const campus = await prisma.campus.findUnique({ where: { id: body.campusId } });
    if (!campus) throw notFound("campus");
    const supportUntil = Date.now() + SUPPORT_MS;
    const principal = await loadPrincipal(user.id, campus.id);
    principal.supportUntil = supportUntil;
    const token = await signAuthToken(principal);
    await writeAudit({ userId: user.id, campusId: campus.id, action: "support", entity: "campus", entityId: campus.id, after: { orgId: campus.orgId, code: campus.code, supportUntil: new Date(supportUntil).toISOString() }, ip: requestIp(request) });
    const response = ok({ token, supportUntil, user: { id: principal.id, campusId: principal.campusId, actorType: principal.actorType, roles: principal.roles }, campus: await campusSummary(principal.campusId) });
    response.cookies.set(AUTH_COOKIE, token, authCookieOptions());
    return response;
  } catch (error) { return fail(error); }
}

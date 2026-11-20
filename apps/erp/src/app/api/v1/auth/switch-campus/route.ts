import { z } from "zod";
import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth-cookie";
import { requestIp, writeAudit } from "@/lib/audit";
import { signAuthToken } from "@/lib/auth-token";
import { campusSummary } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { loadPrincipal, principalFromRequest } from "@/lib/principal";
import { assertPlatformAdmin, normalizeCampusCode } from "@/lib/services/tenants";

const bodySchema = z.object({
  campusId: z.string().min(1).optional(),
  campusCode: z.string().min(2).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertPlatformAdmin(user);
    const body = bodySchema.parse(await readJson(request));
    if (!body.campusId && !body.campusCode) throw validationError({ campusId: "required" });
    const campus = body.campusId
      ? await prisma.campus.findUnique({ where: { id: body.campusId } })
      : await prisma.campus.findFirst({
          where: { code: normalizeCampusCode(body.campusCode ?? "") },
        });
    if (!campus) throw notFound("campus");
    const principal = await loadPrincipal(user.id, campus.id);
    await writeAudit({
      userId: user.id,
      campusId: campus.id,
      action: "switch",
      entity: "campus",
      entityId: campus.id,
      before: { campusId: user.campusId },
      after: { campusId: campus.id, code: campus.code, orgId: campus.orgId },
      ip: requestIp(request),
    });
    const token = await signAuthToken(principal);
    const summary = await campusSummary(principal.campusId);
    const response = ok({
      token,
      user: {
        id: principal.id,
        campusId: principal.campusId,
        actorType: principal.actorType,
        roles: principal.roles,
      },
      campus: summary,
    });
    response.cookies.set(AUTH_COOKIE, token, authCookieOptions());
    return response;
  } catch (error) {
    return fail(error);
  }
}

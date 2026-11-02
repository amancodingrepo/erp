import { z } from "zod";
import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth-cookie";
import { signAuthToken } from "@/lib/auth-token";
import { campusSummary } from "@/lib/campus";
import { validationError } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { loadPrincipal, principalFromRequest } from "@/lib/principal";
import {
  assertPlatformAdmin,
  campusInOrg,
  homeCampusForUser,
} from "@/lib/services/tenants";

const bodySchema = z.object({
  campusId: z.string().min(1).optional(),
  campusCode: z.string().min(2).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertPlatformAdmin(user);
    const body = bodySchema.parse(await readJson(request));
    const key = body.campusId ?? body.campusCode;
    if (!key) throw validationError({ campusId: "required" });
    const home = await homeCampusForUser(user.id);
    const campus = await campusInOrg(home.orgId, key);
    const principal = await loadPrincipal(user.id, campus.id);
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

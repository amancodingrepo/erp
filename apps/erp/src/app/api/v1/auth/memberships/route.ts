import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth-cookie";
import { signAuthToken } from "@/lib/auth-token";
import { campusSummary } from "@/lib/campus";
import { fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import {
  homeForActor,
  listMemberships,
  parseSwitchBody,
  switchMembership,
} from "@/lib/services/memberships";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    return ok({ data: await listMemberships(user.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const toUserId = parseSwitchBody(await readJson(request));
    const principal = await switchMembership(user.id, toUserId);
    const token = await signAuthToken(principal);
    const campus = await campusSummary(principal.campusId);
    const response = ok({
      token,
      home: homeForActor(principal.actorType),
      user: {
        id: principal.id,
        campusId: principal.campusId,
        actorType: principal.actorType,
        roles: principal.roles,
      },
      campus,
    });
    response.cookies.set(AUTH_COOKIE, token, authCookieOptions());
    return response;
  } catch (error) {
    return fail(error);
  }
}

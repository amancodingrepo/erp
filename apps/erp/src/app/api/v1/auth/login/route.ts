import { z } from "zod";
import { signAuthToken } from "@/lib/auth-token";
import { campusSummary } from "@/lib/campus";
import { fail, ok, readJson } from "@/lib/http";
import { authenticateCredentials } from "@/lib/principal";
import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth-cookie";
import { rateLimited } from "@/lib/errors";
import {
  clearLoginRateLimit,
  hitLoginRateLimit,
} from "@/lib/rate-limit-db";

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  portal: z.enum(["staff", "student", "parent"]).default("staff"),
  campusCode: z.string().min(2).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    const body = bodySchema.parse(await readJson(request));
    const key = `login:${body.username}:${ip}`;
    if (await hitLoginRateLimit(key, 5)) {
      throw rateLimited();
    }
    const principal = await authenticateCredentials(body);
    await clearLoginRateLimit(key);
    const token = await signAuthToken(principal);
    const campus = await campusSummary(principal.campusId);
    const response = ok({
      token,
      user: {
        id: principal.id,
        campusId: principal.campusId,
        actorType: principal.actorType,
        roles: principal.roles,
        permissions: principal.permissions,
        studentId: principal.studentId,
        guardianId: principal.guardianId,
        childIds: principal.childIds,
      },
      campus,
    });
    response.cookies.set(AUTH_COOKIE, token, authCookieOptions());
    return response;
  } catch (error) {
    return fail(error);
  }
}

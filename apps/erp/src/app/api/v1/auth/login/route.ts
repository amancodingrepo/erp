import { z } from "zod";
import { signAuthToken } from "@/lib/auth-token";
import { campusSummary } from "@/lib/campus";
import { fail, ok, readJson } from "@/lib/http";
import { authenticateCredentials } from "@/lib/principal";
import { clearRateLimit, hitRateLimit } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/errors";

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  portal: z.enum(["staff", "student", "parent"]).default("staff"),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    const body = bodySchema.parse(await readJson(request));
    const key = `login:${body.username}:${ip}`;
    if (hitRateLimit(key, 5)) {
      throw rateLimited();
    }
    const principal = await authenticateCredentials(body);
    clearRateLimit(key);
    const token = await signAuthToken(principal);
    const campus = await campusSummary(principal.campusId);
    const response = ok({
      token,
      user: {
        id: principal.id,
        actorType: principal.actorType,
        roles: principal.roles,
        permissions: principal.permissions,
      },
      campus,
    });
    response.cookies.set("erp_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (error) {
    return fail(error);
  }
}

import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth-cookie";
import { ok } from "@/lib/http";

export async function POST() {
  const response = ok({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", authCookieOptions(0));
  return response;
}

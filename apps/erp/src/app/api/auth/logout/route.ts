import { AUTH_COOKIE, schoolWorldCookieOptions } from "@/lib/auth-cookie";
import { ok } from "@/lib/http";

export async function POST() {
  const response = ok({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", schoolWorldCookieOptions(0));
  return response;
}

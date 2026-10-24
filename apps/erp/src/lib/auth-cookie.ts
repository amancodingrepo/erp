export const AUTH_COOKIE = "erp_token";
const MAX_AGE = 60 * 60 * 12;

/** Secure cookies only when the public app URL is HTTPS (HTTP Lightsail IP must stay unset). */
export function cookieSecure() {
  const url = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "").trim();
  if (url.startsWith("https://")) return true;
  if (url.startsWith("http://")) return false;
  return process.env.NODE_ENV === "production";
}

export function authCookieOptions(maxAge = MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: cookieSecure(),
  };
}

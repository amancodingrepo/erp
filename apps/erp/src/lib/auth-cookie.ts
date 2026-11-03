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

/** True only when AUTH_URL / NEXTAUTH_URL is explicitly https (no production guess). */
export function authUrlIsHttps() {
  return (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "").trim().startsWith("https://");
}

/**
 * Cookie options for the School World sign-in. Unlike authCookieOptions it never guesses Secure
 * from NODE_ENV: a server still on plain HTTP with no AUTH_URL would otherwise drop the cookie
 * and nobody could sign in.
 */
export function schoolWorldCookieOptions(maxAge?: number) {
  return { ...authCookieOptions(maxAge), secure: authUrlIsHttps() };
}

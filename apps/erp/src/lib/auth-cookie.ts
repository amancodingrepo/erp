export const AUTH_COOKIE = "erp_token";
const MAX_AGE = 60 * 60 * 12;

export function authCookieOptions(maxAge = MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}

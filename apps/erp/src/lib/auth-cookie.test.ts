import { afterEach, describe, expect, it, vi } from "vitest";
import { authUrlIsHttps, schoolWorldCookieOptions } from "./auth-cookie";

afterEach(() => vi.unstubAllEnvs());

describe("schoolWorldCookieOptions", () => {
  it("is Secure only when AUTH_URL is explicitly https", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    expect(schoolWorldCookieOptions().secure).toBe(false);
    vi.stubEnv("AUTH_URL", "http://15.134.63.44");
    expect(schoolWorldCookieOptions().secure).toBe(false);
    vi.stubEnv("AUTH_URL", "https://erp.example.in");
    expect(authUrlIsHttps()).toBe(true);
    expect(schoolWorldCookieOptions()).toMatchObject({ secure: true, httpOnly: true, sameSite: "lax", path: "/", maxAge: 43200 });
    expect(schoolWorldCookieOptions(0).maxAge).toBe(0);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { assertCsrf } from "./csrf";
import { authCookieOptions } from "./auth-cookie";

describe("csrf", () => {
  it("allows Bearer mutations without Origin", () => {
    expect(() =>
      assertCsrf(
        new Request("http://local/api", {
          method: "POST",
          headers: { authorization: "Bearer x" },
        }),
      ),
    ).not.toThrow();
  });

  it("allows GET", () => {
    expect(() => assertCsrf(new Request("http://local/api"))).not.toThrow();
  });
});

describe("auth cookie", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is httpOnly and lax", () => {
    const opts = authCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
  });

  it("drops Secure when AUTH_URL is http", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_URL", "http://15.134.63.44");
    vi.stubEnv("NEXTAUTH_URL", "http://15.134.63.44");
    expect(authCookieOptions().secure).toBe(false);
  });

  it("sets Secure when AUTH_URL is https", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_URL", "https://erp.example.edu");
    expect(authCookieOptions().secure).toBe(true);
  });
});

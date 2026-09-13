import { describe, expect, it } from "vitest";
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
  it("is httpOnly and lax", () => {
    const opts = authCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
  });
});

import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("security headers", () => {
  it("sets nosniff, referrer policy, and deny framing", async () => {
    const headers = nextConfig.headers;
    expect(headers).toBeTypeOf("function");
    const rules = await headers!();
    const pairs = Object.fromEntries(
      rules[0].headers.map((h) => [h.key, h.value]),
    );
    expect(pairs["X-Content-Type-Options"]).toBe("nosniff");
    expect(pairs["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(pairs["X-Frame-Options"]).toBe("DENY");
  });
});

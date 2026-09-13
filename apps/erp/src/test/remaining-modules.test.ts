import { describe, expect, it } from "vitest";

describe("remaining module helpers", () => {
  it("exports redeem/issue/enroll/submit helpers", async () => {
    const mod = await import("@/lib/services/remaining");
    expect(typeof mod.redeemCoupon).toBe("function");
    expect(typeof mod.issueStock).toBe("function");
    expect(typeof mod.enrollCourse).toBe("function");
    expect(typeof mod.submitCbt).toBe("function");
    expect(typeof mod.postChat).toBe("function");
  });
});

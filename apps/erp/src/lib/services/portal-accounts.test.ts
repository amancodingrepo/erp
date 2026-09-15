import { describe, expect, it } from "vitest";

describe("portal usernames", () => {
  it("exports provisionEnrollmentPortals", async () => {
    const mod = await import("./portal-accounts");
    expect(typeof mod.provisionEnrollmentPortals).toBe("function");
  });
});

import { describe, expect, it } from "vitest";
import { parseSwitchBody, toMembershipAlias } from "./memberships";

describe("auth switch alias", () => {
  it("accepts membership_id as the live user id", () => {
    expect(parseSwitchBody({ membership_id: "u2" })).toBe("u2");
    expect(parseSwitchBody({ membershipId: "u2" })).toBe("u2");
    expect(parseSwitchBody({ userId: "u2" })).toBe("u2");
    expect(() => parseSwitchBody({})).toThrow();
    expect(
      toMembershipAlias({
        userId: "u2",
        actorType: "STAFF",
        campusId: "c1",
        campusName: "Main",
        campusCode: "MAIN",
        username: "admin",
        current: false,
      }),
    ).toMatchObject({
      userId: "u2",
      membershipId: "u2",
      membership_id: "u2",
    });
  });
});

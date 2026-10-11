import { describe, expect, it } from "vitest";
import {
  newTemporaryPassword,
  parseOwnPassword,
  parseOwnProfile,
  resettableActor,
} from "./campus-user-passwords";

describe("user passwords", () => {
  it("issues a temporary password of at least 8 characters", () => {
    const first = newTemporaryPassword();
    const second = newTemporaryPassword();
    expect(first.length).toBeGreaterThanOrEqual(8);
    expect(first.startsWith("Erp@")).toBe(true);
    expect(second).not.toBe(first);
  });

  it("allows parent, staff, and student login resets", () => {
    expect(resettableActor("STAFF")).toBe(true);
    expect(resettableActor("GUARDIAN")).toBe(true);
    expect(resettableActor("STUDENT")).toBe(true);
    expect(resettableActor("UNKNOWN")).toBe(false);
  });

  it("parses own profile email and password change", () => {
    expect(parseOwnProfile({ email: "a@b.com" })).toEqual({ email: "a@b.com" });
    expect(parseOwnProfile({ email: "  " })).toEqual({ email: null });
    expect(parseOwnPassword({ current: "oldpass1", next: "newpass12" })).toEqual({
      current: "oldpass1",
      next: "newpass12",
    });
    expect(() => parseOwnPassword({ current: "x", next: "short" })).toThrow();
    expect(() => parseOwnPassword({ next: "longenough" })).toThrow();
  });
});

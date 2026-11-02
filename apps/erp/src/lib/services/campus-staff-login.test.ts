import { describe, expect, it } from "vitest";
import {
  parseStaffCreatePassword,
  staffCreateNeedsLogin,
  staffLoginUsername,
  toStaffLogin,
} from "./campus-staff-login";

describe("staff login helpers", () => {
  it("uses username, then phone, then staff id as login", () => {
    expect(
      staffLoginUsername({ username: " teacher1 ", phone: "999", employeeId: "EMP-9" }),
    ).toBe("teacher1");
    expect(staffLoginUsername({ phone: " 98765 43210 ", employeeId: "EMP-9" })).toBe(
      "9876543210",
    );
    expect(staffLoginUsername({ employeeId: " EMP-9 " })).toBe("EMP-9");
  });

  it("opens a login when role, password, or username is set", () => {
    expect(staffCreateNeedsLogin({})).toBe(false);
    expect(staffCreateNeedsLogin({ roleId: "r1" })).toBe(true);
    expect(staffCreateNeedsLogin({ password: "Secret#12" })).toBe(true);
    expect(staffCreateNeedsLogin({ username: "t1" })).toBe(true);
  });

  it("requires eight characters when a password is typed", () => {
    expect(parseStaffCreatePassword("")).toEqual({ set: false });
    expect(parseStaffCreatePassword("Secret#12")).toEqual({
      set: true,
      password: "Secret#12",
    });
    expect(() => parseStaffCreatePassword("short")).toThrow();
  });

  it("flattens nested role rows for the staff desk", () => {
    expect(
      toStaffLogin({
        id: "u1",
        username: "teacher1",
        isActive: true,
        roles: [{ role: { id: "r1", name: "Teacher" } }],
      }),
    ).toEqual({
      id: "u1",
      username: "teacher1",
      isActive: true,
      roles: [{ id: "r1", name: "Teacher" }],
    });
  });
});

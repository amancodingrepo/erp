import { AttendanceStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { markedAttendanceEntries } from "./attendance";
import { installmentGroups } from "./fees";
import { membershipMatches } from "./memberships";

describe("markedAttendanceEntries", () => {
  it("drops Not Taken so save does not coerce blanks to PRESENT", () => {
    const entries = markedAttendanceEntries([
      { studentId: "a", status: AttendanceStatus.PRESENT },
      { studentId: "b", status: "" },
      { studentId: "c", status: null },
      { studentId: "d", status: AttendanceStatus.ABSENT },
    ]);
    expect(entries).toEqual([
      { studentId: "a", status: AttendanceStatus.PRESENT },
      { studentId: "d", status: AttendanceStatus.ABSENT },
    ]);
  });
});

describe("installmentGroups", () => {
  it("groups live fee-type lines by due date without a hardcoded installment list", () => {
    const groups = installmentGroups([
      { feeTypeId: "tuition", amount: 1000, dueDate: "2026-04-10" },
      { feeTypeId: "bus", amount: 200, dueDate: "2026-04-10" },
      { feeTypeId: "tuition", amount: 1000, dueDate: "2026-07-10" },
      { feeTypeId: "skip", amount: 0 },
    ]);
    expect(groups).toEqual([
      {
        dueDate: "2026-04-10",
        installmentId: null,
        lines: [
          { feeTypeId: "tuition", amount: 1000 },
          { feeTypeId: "bus", amount: 200 },
        ],
      },
      {
        dueDate: "2026-07-10",
        installmentId: null,
        lines: [{ feeTypeId: "tuition", amount: 1000 }],
      },
    ]);
  });

  it("groups named installment lines together even when due dates differ", () => {
    const groups = installmentGroups([
      { feeTypeId: "tuition", amount: 1000, dueDate: "2026-04-10", installmentId: "term-1" },
      { feeTypeId: "bus", amount: 200, dueDate: "2026-04-20", installmentId: "term-1" },
      { feeTypeId: "tuition", amount: 1000, dueDate: "2026-07-10", installmentId: "term-2" },
    ]);
    expect(groups).toEqual([
      {
        dueDate: "2026-04-10",
        installmentId: "term-1",
        lines: [
          { feeTypeId: "tuition", amount: 1000 },
          { feeTypeId: "bus", amount: 200 },
        ],
      },
      {
        dueDate: "2026-07-10",
        installmentId: "term-2",
        lines: [{ feeTypeId: "tuition", amount: 1000 }],
      },
    ]);
  });
});

describe("membershipMatches", () => {
  const me = {
    id: "u1",
    email: "a@school.test",
    username: "asha",
    orgId: "org",
  };

  it("allows the same email in the org and ignores other usernames", () => {
    expect(
      membershipMatches(me, {
        id: "u2",
        email: "A@school.test",
        username: "parent-asha",
        orgId: "org",
        isActive: true,
      }),
    ).toBe(true);
    expect(
      membershipMatches(me, {
        id: "u3",
        email: "other@school.test",
        username: "asha",
        orgId: "org",
        isActive: true,
      }),
    ).toBe(false);
    expect(
      membershipMatches(me, {
        id: "u1",
        email: "a@school.test",
        username: "asha",
        orgId: "org",
        isActive: true,
      }),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  attendanceKpis,
  contactAudiences,
  containsMatch,
  dropBroadcastList,
  parseBroadcastLists,
  studentMatchesSearch,
  upsertBroadcastList,
} from "./directory";

describe("studentMatchesSearch", () => {
  const student = {
    firstName: "Asha",
    lastName: "Khan",
    mobile: "9876543210",
    email: "asha@school.test",
    admissionNo: "A-12",
    enrollmentNo: "EN-9",
    scholarNo: "SCH-1",
    pen: "P99",
  };

  it("matches phone, email, and school ids without a hardcoded id list in the caller", () => {
    expect(studentMatchesSearch(student, { phone: "765432" })).toBe(true);
    expect(studentMatchesSearch(student, { email: "asha@" })).toBe(true);
    expect(studentMatchesSearch(student, { id: "SCH-1" })).toBe(true);
    expect(studentMatchesSearch(student, { id: "P99" })).toBe(true);
    expect(studentMatchesSearch(student, { q: "khan" })).toBe(true);
    expect(studentMatchesSearch(student, { q: "nope" })).toBe(false);
  });

  it("honours exact match", () => {
    expect(studentMatchesSearch(student, { q: "Asha", exact: true })).toBe(true);
    expect(studentMatchesSearch(student, { q: "Ash", exact: true })).toBe(false);
    expect(containsMatch("Asha", "Ash", false)).toBe(true);
  });
});

describe("attendanceKpis", () => {
  it("builds status buckets from whatever statuses appear", () => {
    const kpis = attendanceKpis([
      { status: "PRESENT" },
      { status: "PRESENT" },
      { status: "LEAVE" },
      { status: "CUSTOM" },
    ]);
    expect(kpis.marked).toBe(4);
    expect(kpis.present).toBe(2);
    expect(kpis.percent).toBe(50);
    expect(kpis.byStatus).toEqual({ PRESENT: 2, LEAVE: 1, CUSTOM: 1 });
  });

  it("counts Not Taken as enrolled minus marked rows", () => {
    const kpis = attendanceKpis([{ status: "PRESENT" }, { status: "ABSENT" }], 5);
    expect(kpis.enrolled).toBe(5);
    expect(kpis.notTaken).toBe(3);
    expect(kpis.marked).toBe(2);
  });
});

describe("contactAudiences", () => {
  it("adds one audience per live class name", () => {
    const audiences = contactAudiences([
      { id: "c1", name: "5 A" },
      { id: "c2", name: "Nursery" },
    ]);
    expect(audiences.map((a) => a.id)).toEqual([
      "all",
      "staff",
      "students",
      "guardians",
      "class:c1",
      "class:c2",
    ]);
    expect(audiences.at(-1)?.label).toBe("Nursery");
  });

  it("appends saved broadcast lists as list: audiences", () => {
    const lists = upsertBroadcastList(parseBroadcastLists([]), {
      name: "Fee defaulters",
      studentIds: ["s1"],
    });
    const audiences = contactAudiences([{ id: "c1", name: "5 A" }], lists);
    expect(audiences.some((a) => a.id.startsWith("list:") && a.label === "Fee defaulters")).toBe(
      true,
    );
    expect(() => upsertBroadcastList([], { name: "Empty" })).toThrow();
    expect(dropBroadcastList(lists, lists[0]!.id)).toEqual([]);
    expect(() => dropBroadcastList(lists, "missing")).toThrow();
  });
});

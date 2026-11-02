import { describe, expect, it } from "vitest";
import { groupClassMarkEntries } from "./campus-class-marks";

describe("class marks", () => {
  it("groups entries by exam subject and keeps the last student row", () => {
    expect(
      groupClassMarkEntries([
        { examSubjectId: "es1", studentId: "s1", marks: 40 },
        { examSubjectId: "es2", studentId: "s1", marks: 50, isAbsent: false },
        { examSubjectId: "es1", studentId: "s1", marks: 41 },
        { examSubjectId: "es1", studentId: "s2", isAbsent: true },
      ]),
    ).toEqual([
      {
        examSubjectId: "es1",
        entries: [
          { studentId: "s1", marks: 41, isAbsent: false },
          { studentId: "s2", marks: undefined, isAbsent: true },
        ],
      },
      {
        examSubjectId: "es2",
        entries: [{ studentId: "s1", marks: 50, isAbsent: false }],
      },
    ]);
    expect(groupClassMarkEntries([])).toEqual([]);
  });

  it("requires examSubjectId and studentId on each row", () => {
    expect(() => groupClassMarkEntries({ entries: [] })).toThrow();
    expect(() =>
      groupClassMarkEntries([{ examSubjectId: "es1", marks: 10 }]),
    ).toThrow();
    expect(() =>
      groupClassMarkEntries([{ studentId: "s1", marks: 10 }]),
    ).toThrow();
  });
});

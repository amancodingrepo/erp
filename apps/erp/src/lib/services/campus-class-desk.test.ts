import { describe, expect, it } from "vitest";
import {
  parseClassOfferings,
  replaceClassTeachers,
} from "./campus-class-desk";

describe("class desk", () => {
  it("replaces class teachers only on live sections of that class", () => {
    const next = replaceClassTeachers(
      [
        { sectionId: "s1", staffId: "t1" },
        { sectionId: "other", staffId: "t9" },
      ],
      ["s1", "s2"],
      [{ sectionId: "s2", staffId: "t2" }],
    );
    expect(next).toEqual([
      { sectionId: "other", staffId: "t9" },
      { sectionId: "s2", staffId: "t2" },
    ]);
    expect(
      replaceClassTeachers(
        [{ sectionId: "s1", staffId: "t1" }],
        ["s1"],
        [{ sectionId: "s1", staffId: "" }],
      ),
    ).toEqual([]);
    expect(() =>
      replaceClassTeachers([], ["s1"], [{ sectionId: "x", staffId: "t1" }]),
    ).toThrow();
  });

  it("keeps unique live subject offerings for a class", () => {
    expect(
      parseClassOfferings(
        [
          { subjectId: "sub1", staffId: "t1" },
          { subjectId: "sub1" },
          "sub2",
        ],
        ["sub1", "sub2"],
        ["sec-a"],
      ),
    ).toEqual([
      { subjectId: "sub1", sectionId: null, staffId: null },
      { subjectId: "sub2", sectionId: null, staffId: null },
    ]);
    expect(
      parseClassOfferings(
        [{ subjectId: "sub1", sectionId: "sec-a", staffId: "t1" }],
        ["sub1"],
        ["sec-a"],
      ),
    ).toEqual([{ subjectId: "sub1", sectionId: "sec-a", staffId: "t1" }]);
    expect(parseClassOfferings([], ["sub1"], [])).toEqual([]);
    expect(() => parseClassOfferings(["missing"], ["sub1"], [])).toThrow();
    expect(() =>
      parseClassOfferings(
        [{ subjectId: "sub1", sectionId: "sec-z" }],
        ["sub1"],
        ["sec-a"],
      ),
    ).toThrow();
  });
});

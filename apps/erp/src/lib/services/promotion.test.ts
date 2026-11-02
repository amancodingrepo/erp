import { describe, expect, it } from "vitest";
import {
  fromSectionFromEnrollments,
  parseYearEnd,
  toSessionForYearEnd,
} from "./promotion";

describe("year-end aliases", () => {
  it("maps spec year-end bodies onto promote input", () => {
    expect(
      parseYearEnd("change-class", {
        student_ids: ["s1", "s2"],
        to_class_id: "sec-b",
        from_class_id: "sec-a",
      }),
    ).toMatchObject({
      procedure: "change",
      studentIds: ["s1", "s2"],
      fromSectionId: "sec-a",
      toSectionId: "sec-b",
    });
    expect(
      parseYearEnd("promote", {
        studentIds: ["s1"],
        from_class_id: "sec-a",
        to_class_id: "sec-b",
        academic_year_id: "y2",
      }),
    ).toMatchObject({
      procedure: "promote",
      fromSectionId: "sec-a",
      toSectionId: "sec-b",
      toSessionId: "y2",
    });
    expect(parseYearEnd("alumni", { student_ids: ["s1"] }).procedure).toBe(
      "alumni",
    );
    expect(() => parseYearEnd("expel", { student_ids: ["s1"] })).toThrow();
    expect(() => parseYearEnd("promote", { student_ids: [] })).toThrow();
  });

  it("resolves from-section and same-year / next-year session from live rows", () => {
    expect(
      fromSectionFromEnrollments(
        ["s1", "s2"],
        [
          { studentId: "s1", sectionId: "sec-a" },
          { studentId: "s2", sectionId: "sec-a" },
        ],
      ),
    ).toBe("sec-a");
    expect(() =>
      fromSectionFromEnrollments(
        ["s1", "s2"],
        [
          { studentId: "s1", sectionId: "sec-a" },
          { studentId: "s2", sectionId: "sec-b" },
        ],
      ),
    ).toThrow();
    expect(
      toSessionForYearEnd("change", "y1", [
        { id: "y1", sequenceNo: 1 },
        { id: "y2", sequenceNo: 2 },
      ]),
    ).toBe("y1");
    expect(
      toSessionForYearEnd("promote", "y1", [
        { id: "y1", sequenceNo: 1 },
        { id: "y2", sequenceNo: 2 },
      ]),
    ).toBe("y2");
    expect(toSessionForYearEnd("alumni", "y1", [])).toBeUndefined();
  });
});

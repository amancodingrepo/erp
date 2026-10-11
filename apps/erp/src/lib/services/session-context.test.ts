import { describe, expect, it } from "vitest";
import {
  attachClassTeachers,
  classTeacherForSection,
  enrollmentScope,
  getClassTeacherRow,
  nextYearIdFromLive,
  academicYearDeleteBlocked,
  parseAcademicYearCreate,
  parseAcademicYearPatch,
  parseClassTeachers,
  sessionIdFromCookieHeader,
  toAcademicYear,
  upsertClassTeacher,
} from "./session-context";

describe("enrollmentScope", () => {
  it("uses the stored session when set, otherwise current enrollments", () => {
    expect(enrollmentScope("s1")).toEqual({ sessionId: "s1" });
    expect(enrollmentScope(null)).toEqual({ isCurrent: true });
    expect(enrollmentScope("")).toEqual({ isCurrent: true });
  });
});

describe("sessionIdFromCookieHeader", () => {
  it("reads erp_session from the cookie header", () => {
    expect(sessionIdFromCookieHeader("erp_token=abc; erp_session=year-2")).toBe(
      "year-2",
    );
    expect(sessionIdFromCookieHeader("erp_token=abc")).toBeNull();
  });
});

describe("academic year aliases", () => {
  it("maps live sessions onto spec academic years with next_year_id", () => {
    const years = [
      { id: "y1", sequenceNo: 1 },
      { id: "y2", sequenceNo: 2 },
      { id: "y3", sequenceNo: 4 },
    ];
    expect(nextYearIdFromLive("y1", years)).toBe("y2");
    expect(nextYearIdFromLive("y2", years)).toBe("y3");
    expect(nextYearIdFromLive("y3", years)).toBeNull();
    expect(
      toAcademicYear(
        {
          id: "y1",
          name: "2025-26",
          code: "2526",
          sequenceNo: 1,
          startDate: null,
          endDate: null,
          isCurrent: true,
          isActive: true,
        },
        years,
      ),
    ).toMatchObject({
      id: "y1",
      name: "2025-26",
      is_current: true,
      nextYearId: "y2",
      next_year_id: "y2",
    });
  });

  it("parses academic-year create including spec field aliases", () => {
    expect(
      parseAcademicYearCreate({
        name: " 2026-27 ",
        start_date: "2026-06-01",
        end_date: "2027-05-31",
        is_current: true,
        sequence_no: 2,
      }),
    ).toEqual({
      name: "2026-27",
      code: undefined,
      sequenceNo: 2,
      startDate: "2026-06-01",
      endDate: "2027-05-31",
      isCurrent: true,
      receiptPrefix: undefined,
      invoicePrefix: undefined,
      admissionPrefix: undefined,
      firstAdmissionNo: undefined,
    });
    expect(() => parseAcademicYearCreate({ name: " " })).toThrow();
  });

  it("parses academic-year patches and blocks delete of current or used years", () => {
    expect(
      parseAcademicYearPatch({
        name: " 2027-28 ",
        start_date: "2027-06-01",
        is_current: true,
        sequence_no: 3,
        receipt_prefix: "RCP",
      }),
    ).toEqual({
      name: "2027-28",
      code: undefined,
      sequenceNo: 3,
      startDate: "2027-06-01",
      endDate: undefined,
      isCurrent: true,
      receiptPrefix: "RCP",
      invoicePrefix: undefined,
      admissionPrefix: undefined,
      firstAdmissionNo: undefined,
    });
    expect(parseAcademicYearPatch({ code: "" })).toEqual({
      name: undefined,
      code: "",
      sequenceNo: undefined,
      startDate: undefined,
      endDate: undefined,
      isCurrent: undefined,
      receiptPrefix: undefined,
      invoicePrefix: undefined,
      admissionPrefix: undefined,
      firstAdmissionNo: undefined,
    });
    expect(() => parseAcademicYearPatch({})).toThrow();
    expect(() => parseAcademicYearPatch({ name: " " })).toThrow();
    expect(
      academicYearDeleteBlocked({
        isCurrent: true,
        isCampusCurrent: false,
        enrollments: 0,
        feeMasters: 0,
        examGroups: 0,
        timetableSlots: 0,
        workingDays: 0,
      }),
    ).toBe(true);
    expect(
      academicYearDeleteBlocked({
        isCurrent: false,
        isCampusCurrent: true,
        enrollments: 0,
        feeMasters: 0,
        examGroups: 0,
        timetableSlots: 0,
        workingDays: 0,
      }),
    ).toBe(true);
    expect(
      academicYearDeleteBlocked({
        isCurrent: false,
        isCampusCurrent: false,
        enrollments: 1,
        feeMasters: 0,
        examGroups: 0,
        timetableSlots: 0,
        workingDays: 0,
      }),
    ).toBe(true);
    expect(
      academicYearDeleteBlocked({
        isCurrent: false,
        isCampusCurrent: false,
        enrollments: 0,
        feeMasters: 0,
        examGroups: 0,
        timetableSlots: 0,
        workingDays: 0,
      }),
    ).toBe(false);
  });
});

describe("class teachers", () => {
  it("keeps one staff id per live section without a hardcoded class list", () => {
    const first = parseClassTeachers([
      { sectionId: "sec-a", staffId: "t1" },
      { sectionId: "  ", staffId: "t2" },
      null,
    ]);
    expect(first).toEqual([{ sectionId: "sec-a", staffId: "t1" }]);
    const next = upsertClassTeacher(first, "sec-b", "t2");
    expect(classTeacherForSection(next, "sec-b")).toBe("t2");
    const cleared = upsertClassTeacher(next, "sec-a", null);
    expect(classTeacherForSection(cleared, "sec-a")).toBeNull();
    expect(cleared).toHaveLength(1);
    expect(() => getClassTeacherRow(first, "missing")).toThrow();
    expect(getClassTeacherRow(next, "sec-b")).toEqual({
      sectionId: "sec-b",
      staffId: "t2",
    });
  });

  it("attaches live staff names onto campus sections", () => {
    const attached = attachClassTeachers(
      [
        {
          id: "c1",
          name: "Class 1",
          sections: [
            { id: "sec-a", name: "A" },
            { id: "sec-b", name: "B" },
          ],
        },
      ],
      [{ sectionId: "sec-a", staffId: "t1" }],
      [{ id: "t1", firstName: "Rina", lastName: "Shah" }],
    );
    expect(attached[0].sections[0].classTeacher).toEqual({
      staffId: "t1",
      name: "Rina Shah",
    });
    expect(attached[0].sections[1].classTeacher).toBeNull();
  });
});

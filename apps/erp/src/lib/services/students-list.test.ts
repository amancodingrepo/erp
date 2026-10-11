import { describe, expect, it } from "vitest";
import {
  namedGuardianPairs,
  splitStudentPatch,
  studentListSearchOr,
  toStudentListRow,
} from "./students";

describe("studentListSearchOr", () => {
  it("searches live school ids and guardian names, not a hardcoded class list", () => {
    const or = studentListSearchOr("APAAR-9");
    const keys = or.flatMap((clause) => Object.keys(clause));
    expect(keys).toEqual(
      expect.arrayContaining([
        "admissionNo",
        "enrollmentNo",
        "scholarNo",
        "pen",
        "apaarId",
        "sssmId",
        "grn",
        "saralId",
        "janAadhaar",
        "rollNo",
        "rfid",
        "guardians",
      ]),
    );
    expect(studentListSearchOr("  ")).toEqual([]);
  });
});

describe("toStudentListRow", () => {
  it("shows father, mother, and parent login from live guardian rows", () => {
    const row = toStudentListRow({
      id: "s1",
      admissionNo: "A1",
      firstName: "Isha",
      lastName: "Shah",
      rollNo: "12",
      enrollmentNo: "ENR-1",
      scholarNo: "SC-1",
      pen: "P1",
      apaarId: "AP1",
      parentLoginEnabled: false,
      dob: null,
      gender: null,
      mobile: null,
      status: "ACTIVE",
      category: null,
      enrollments: [
        {
          id: "e1",
          rollNo: "12",
          class: { name: "Class 1" },
          section: { name: "A" },
        },
      ],
      guardians: [
        { relation: "father", guardian: { name: "Rahul" } },
        { relation: "mother", guardian: { name: "Meera" } },
      ],
    });
    expect(row.fatherName).toBe("Rahul");
    expect(row.motherName).toBe("Meera");
    expect(row.parentLoginEnabled).toBe(false);
    expect(row.pen).toBe("P1");
    expect(row.apaarId).toBe("AP1");
  });
});

describe("namedGuardianPairs", () => {
  it("keeps only named father and mother", () => {
    expect(
      namedGuardianPairs({ fatherName: "  Rahul ", motherName: "" }),
    ).toEqual([{ relation: "father", name: "Rahul" }]);
  });
});

describe("splitStudentPatch", () => {
  it("keeps guardian names off the student row", () => {
    const split = splitStudentPatch({
      pen: "P1",
      fatherName: "Rahul",
      motherName: "Meera",
      parentLoginEnabled: true,
    });
    expect(split.student).toEqual({ pen: "P1", parentLoginEnabled: true });
    expect(split.guardians).toEqual([
      { relation: "father", name: "Rahul" },
      { relation: "mother", name: "Meera" },
    ]);
  });
});

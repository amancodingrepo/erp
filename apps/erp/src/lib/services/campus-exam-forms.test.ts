import { ExamFormKind } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { dec } from "@/lib/money";
import {
  examFormPatchData,
  examFormWindowDeleteBlocked,
  examFormWindowPatchData,
} from "./campus-exam-forms";

const existing = {
  opensAt: new Date("2026-09-01T00:00:00.000Z"),
  closesAt: new Date("2026-09-10T00:00:00.000Z"),
  feeAmount: dec("100"),
  isActive: true,
  kind: ExamFormKind.ATKT,
};

describe("exam form windows", () => {
  it("blocks delete when forms exist and maps fee and dates", () => {
    expect(examFormWindowDeleteBlocked(0)).toBe(false);
    expect(examFormWindowDeleteBlocked(1)).toBe(true);
    expect(
      examFormWindowPatchData(existing, { feeAmount: "150", isActive: false }).isActive,
    ).toBe(false);
    expect(
      examFormWindowPatchData(existing, { feeAmount: "150" }).feeAmount?.toString(),
    ).toBe("150");
    expect(() =>
      examFormWindowPatchData(existing, { closesAt: "2026-08-01T00:00:00.000Z" }),
    ).toThrow();
    expect(() => examFormWindowPatchData(existing, { feeAmount: "-1" })).toThrow();
  });
});

describe("exam form submissions", () => {
  it("keeps unique subject ids", () => {
    expect(examFormPatchData({ subjectIds: [" s1 ", "s1", "s2"] }).subjectIds).toEqual([
      "s1",
      "s2",
    ]);
    expect(() => examFormPatchData({})).toThrow();
    expect(() => examFormPatchData({ subjectIds: [] })).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import {
  averagePercents,
  directAttainmentPercent,
  isMappingWeight,
  overallPo,
  weightedPoDirect,
} from "./copo-attainment";

describe("CO-PO attainment", () => {
  it("accepts mapping 0-3 and computes direct plus 80/20 overall", () => {
    expect(isMappingWeight(3)).toBe(true);
    expect(isMappingWeight(4)).toBe(false);
    expect(
      directAttainmentPercent([
        { marks: 40, isAbsent: false, minMarks: 40 },
        { marks: 20, isAbsent: false, minMarks: 40 },
        { marks: null, isAbsent: true, minMarks: 40 },
      ]),
    ).toBe(50);
    expect(averagePercents([50, 70])).toBe(60);
    expect(weightedPoDirect([{ coPercent: 50, weight: 3 }])).toBe(50);
    expect(overallPo(50, 80)).toBe(56);
    expect(overallPo(50, null)).toBe(50);
  });
});

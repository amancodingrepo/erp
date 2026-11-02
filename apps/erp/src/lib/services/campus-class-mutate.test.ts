import { describe, expect, it } from "vitest";
import { classDeleteBlocked, classPatchData } from "./campus-class-mutate";

describe("class mutate", () => {
  it("builds a class patch and blocks delete while students are enrolled", () => {
    expect(classPatchData({ name: "  FY BCom  ", yearNo: 1 })).toEqual({
      name: "FY BCom",
      yearNo: 1,
    });
    expect(classPatchData({ isActive: false, sequenceNo: 3 })).toEqual({
      isActive: false,
      sequenceNo: 3,
    });
    expect(classPatchData({ yearNo: null })).toEqual({ yearNo: null });
    expect(() => classPatchData({ name: " " })).toThrow();
    expect(classDeleteBlocked(2)).toBe(true);
    expect(classDeleteBlocked(0)).toBe(false);
  });
});

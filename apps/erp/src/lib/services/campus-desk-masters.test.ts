import { describe, expect, it } from "vitest";
import {
  gradePatchData,
  leaveTypeDeleteBlocked,
  leaveTypePatchData,
  periodDeleteBlocked,
  periodPatchData,
} from "./campus-desk-masters";

describe("desk live masters", () => {
  it("blocks leave-type and period deletes when related rows exist", () => {
    expect(leaveTypeDeleteBlocked(0)).toBe(false);
    expect(leaveTypeDeleteBlocked(1)).toBe(true);
    expect(periodDeleteBlocked(0)).toBe(false);
    expect(periodDeleteBlocked(3)).toBe(true);
  });

  it("maps grade, leave-type, and period patches", () => {
    expect(
      gradePatchData(
        { name: "Distinction", letter: "A", minPct: 80, maxPct: 100, points: 4 },
        { letter: " A+ ", minPct: 85 },
      ),
    ).toEqual({
      name: "Distinction",
      letter: "A+",
      minPct: 85,
      maxPct: 100,
    });
    expect(
      leaveTypePatchData({ name: "Sick", daysYear: 12 }, { daysYear: 10 }),
    ).toEqual({ name: "Sick", daysYear: 10 });
    expect(
      periodPatchData(
        { name: "P1", startTime: "09:00", endTime: "09:50", sortOrder: 1 },
        { endTime: " 10:00 ", sortOrder: 2 },
      ),
    ).toEqual({
      name: "P1",
      startTime: "09:00",
      endTime: "10:00",
      sortOrder: 2,
    });
    expect(() =>
      gradePatchData(
        { name: "A", letter: "A", minPct: 80, maxPct: 100, points: null },
        { name: " " },
      ),
    ).toThrow();
    expect(() =>
      gradePatchData(
        { name: "A", letter: "A", minPct: 80, maxPct: 100, points: null },
        { minPct: 90, maxPct: 70 },
      ),
    ).toThrow();
    expect(() =>
      leaveTypePatchData({ name: "Sick", daysYear: 12 }, { name: " " }),
    ).toThrow();
    expect(() =>
      periodPatchData(
        { name: "P1", startTime: "09:00", endTime: "09:50", sortOrder: 1 },
        { startTime: " " },
      ),
    ).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { attendancePercentStats } from "./attendance";

describe("attendancePercentStats", () => {
  it("is present over working days when there is no leave", () => {
    expect(attendancePercentStats({ workingDays: 2, present: 1, exempt: 0 })).toEqual({
      present: 1,
      total: 2,
      percent: 50,
    });
  });

  it("subtracts exempt leave from the working-day denominator", () => {
    expect(attendancePercentStats({ workingDays: 2, present: 1, exempt: 1 })).toEqual({
      present: 1,
      total: 1,
      percent: 100,
    });
  });

  it("falls back to marked non-holiday days when the calendar is empty", () => {
    expect(
      attendancePercentStats({
        workingDays: 0,
        present: 1,
        exempt: 0,
        markedTotal: 1,
      }),
    ).toEqual({ present: 1, total: 1, percent: 100 });
  });

  it("does not let exempt push the denominator below zero", () => {
    expect(attendancePercentStats({ workingDays: 1, present: 0, exempt: 4 })).toEqual({
      present: 0,
      total: 0,
      percent: 0,
    });
  });
});

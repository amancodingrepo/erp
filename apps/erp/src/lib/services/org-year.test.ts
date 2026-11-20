import { describe, expect, it } from "vitest";
import { currentSchoolYear } from "./tenants";

describe("currentSchoolYear", () => {
  it("uses the June–May year that contains the date", () => {
    expect(currentSchoolYear(new Date(2026, 10, 12)).name).toBe("2026-27");
    expect(currentSchoolYear(new Date(2026, 5, 1)).name).toBe("2026-27");
    expect(currentSchoolYear(new Date(2026, 4, 31)).name).toBe("2025-26");
    expect(currentSchoolYear(new Date(2026, 2, 1)).name).toBe("2025-26");
  });

  it("sets the session from 1 June through 31 May", () => {
    const year = currentSchoolYear(new Date(2026, 10, 12));
    expect(year.code).toBe("2026-27");
    expect(year.startDate.toISOString().slice(0, 10)).toBe("2026-06-01");
    expect(year.endDate.toISOString().slice(0, 10)).toBe("2027-05-31");
  });
});

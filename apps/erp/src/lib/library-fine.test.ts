import { describe, expect, it } from "vitest";
import { lateDays, libraryFine } from "./library-fine";

describe("library fine", () => {
  it("charges per day after due date and zero if on time", () => {
    const due = new Date("2026-09-01T00:00:00.000Z");
    expect(lateDays(due, new Date("2026-09-01T00:00:00.000Z"))).toBe(0);
    expect(libraryFine(due, new Date("2026-09-04T00:00:00.000Z"), 5)).toBe(15);
  });
});

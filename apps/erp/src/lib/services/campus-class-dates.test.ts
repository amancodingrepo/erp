import { describe, expect, it } from "vitest";
import {
  attachClassDates,
  datesForClass,
  parseNamedClassDates,
  upsertNamedClassDate,
} from "./campus-class-dates";

describe("class result and opening dates", () => {
  it("stores one named ISO date per class and attaches both kinds", () => {
    const result = upsertNamedClassDate(parseNamedClassDates([]), {
      classId: "c1",
      name: "Term 1",
      date: "2026-09-15",
    });
    expect(datesForClass(result, "c1")[0]).toMatchObject({
      name: "Term 1",
      date: "2026-09-15",
    });
    expect(
      upsertNamedClassDate(result, { classId: "c1", name: "Term 1", date: "2026-09-20" }),
    ).toHaveLength(1);
    const opening = upsertNamedClassDate([], {
      classId: "c1",
      name: "Session start",
      date: "2026-04-01",
    });
    expect(
      attachClassDates([{ id: "c1", name: "I-A" }], result, opening)[0],
    ).toMatchObject({
      resultDates: [{ name: "Term 1", date: "2026-09-15" }],
      openingDates: [{ name: "Session start", date: "2026-04-01" }],
    });
    expect(() =>
      upsertNamedClassDate([], { classId: "c1", name: "Term 1", date: "15-09-2026" }),
    ).toThrow();
    expect(() =>
      upsertNamedClassDate([], { classId: "c1", name: " ", date: "2026-09-15" }),
    ).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { isExamFormWindowOpen } from "./exam-form-window";

describe("exam form window", () => {
  it("is open on the boundary and closed outside", () => {
    const opens = new Date("2026-09-01T00:00:00.000Z");
    const closes = new Date("2026-09-10T00:00:00.000Z");
    expect(isExamFormWindowOpen(opens, closes, opens)).toBe(true);
    expect(isExamFormWindowOpen(opens, closes, closes)).toBe(true);
    expect(
      isExamFormWindowOpen(opens, closes, new Date("2026-08-31T23:59:59.000Z")),
    ).toBe(false);
    expect(
      isExamFormWindowOpen(opens, closes, new Date("2026-09-10T00:00:01.000Z")),
    ).toBe(false);
  });
});

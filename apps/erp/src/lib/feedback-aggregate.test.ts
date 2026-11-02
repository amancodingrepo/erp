import { describe, expect, it } from "vitest";
import { averageRating, countByOption, parseRating } from "./feedback-aggregate";

describe("feedback aggregate", () => {
  it("averages ratings and counts MCQ options", () => {
    expect(averageRating([4, 2])).toBe(3);
    expect(parseRating(6)).toBeNull();
    expect(parseRating(5)).toBe(5);
    expect(countByOption(["A", "B", "A"])).toEqual({ A: 2, B: 1 });
  });
});

import { describe, expect, it } from "vitest";
import { buildMeritRanks } from "./merit";

describe("merit ranking", () => {
  const cutoffs = [
    { programId: "p1", roundNo: 1, categoryCode: "GEN", minScore: 80 },
    { programId: "p1", roundNo: 1, categoryCode: "OBC", minScore: 70 },
  ];

  it("ranks by score and excludes below-cutoff applicants", () => {
    const result = buildMeritRanks(
      [
        { id: "a", score: 90, categoryCode: "GEN", programId: "p1" },
        { id: "b", score: 75, categoryCode: "GEN", programId: "p1" },
        { id: "c", score: 75, categoryCode: "OBC", programId: "p1" },
        { id: "d", score: 60, categoryCode: "OBC", programId: "p1" },
      ],
      cutoffs,
      1,
      "p1",
    );
    expect(result.ranked.map((r) => r.id)).toEqual(["a", "c"]);
    expect(result.ranked[0].rank).toBe(1);
    expect(result.ranked[1].rank).toBe(2);
    expect(result.rejected.sort()).toEqual(["b", "d"]);
  });
});

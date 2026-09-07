import { describe, expect, it } from "vitest";
import {
  criterionCompletionPercent,
  safeEvidenceUrl,
} from "./naac-criteria";

describe("NAAC helpers", () => {
  it("rounds completion percent and rejects unsafe evidence URLs", () => {
    expect(criterionCompletionPercent(0, 0)).toBe(0);
    expect(criterionCompletionPercent(1, 2)).toBe(50);
    expect(criterionCompletionPercent(2, 3)).toBe(67);
    expect(safeEvidenceUrl("uploads/naac/proof.pdf")).toBe("uploads/naac/proof.pdf");
    expect(safeEvidenceUrl("javascript:alert(1)")).toBeNull();
    expect(safeEvidenceUrl("  ")).toBeNull();
  });
});

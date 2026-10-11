import { describe, expect, it } from "vitest";
import { upsertNamedMaster } from "./academics-masters";
import {
  attachCoScholastic,
  bulkCoScholastic,
  coScholasticAspectDeleteBlocked,
  parseCoScholastic,
  upsertCoScholastic,
} from "./campus-coscholastic";

describe("co-scholastic entries", () => {
  it("stores one grade per student and aspect, and can bulk-apply", () => {
    const aspects = upsertNamedMaster([], { name: "Work education" });
    const aspectId = aspects[0]!.id;
    const rows = upsertCoScholastic(
      parseCoScholastic([]),
      { studentId: "s1", aspectId, grade: "A", remark: "Steady" },
      aspects,
    );
    expect(attachCoScholastic(rows, aspects)[0]).toMatchObject({
      aspect: "Work education",
      grade: "A",
    });
    expect(
      upsertCoScholastic(rows, { studentId: "s1", aspectId, grade: "B" }, aspects),
    ).toHaveLength(1);
    expect(() =>
      upsertCoScholastic([], { studentId: "s1", aspectId: "missing", grade: "A" }, aspects),
    ).toThrow();
    expect(() =>
      upsertCoScholastic([], { studentId: "s1", aspectId, grade: " " }, aspects),
    ).toThrow();
    const bulk = bulkCoScholastic(
      [],
      { studentIds: ["s1", "s2"], aspectId, grade: "A" },
      aspects,
    );
    expect(bulk).toHaveLength(2);
    expect(() =>
      bulkCoScholastic([], { studentIds: [], aspectId, grade: "A" }, aspects),
    ).toThrow();
    expect(coScholasticAspectDeleteBlocked([], aspectId)).toBe(false);
    expect(coScholasticAspectDeleteBlocked(rows, aspectId)).toBe(true);
    expect(coScholasticAspectDeleteBlocked(rows, "missing")).toBe(false);
  });
});

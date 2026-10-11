import { describe, expect, it } from "vitest";
import { upsertNamedMaster } from "./academics-masters";
import {
  attachEyfsAreas,
  eyfsAreaDeleteBlocked,
  parentEyfs,
  parseEyfsObservations,
  removeEyfsObservation,
  upsertEyfsObservation,
} from "./campus-eyfs";

describe("eyfs observations", () => {
  it("requires a named area and a note, and optional https evidence", () => {
    const areas = upsertNamedMaster([], { name: "Communication and Language" });
    const areaId = areas[0]!.id;
    const rows = upsertEyfsObservation(
      parseEyfsObservations([]),
      { studentId: "s1", areaId, note: "Spoke in full sentences" },
      areas,
    );
    expect(rows[0]?.note).toBe("Spoke in full sentences");
    expect(attachEyfsAreas(rows, areas)[0]?.area).toBe(
      "Communication and Language",
    );
    expect(() =>
      upsertEyfsObservation([], { studentId: "s1", areaId: "missing", note: "x" }, areas),
    ).toThrow();
    expect(() =>
      upsertEyfsObservation([], { studentId: "s1", areaId, note: " " }, areas),
    ).toThrow();
    expect(() =>
      upsertEyfsObservation(
        [],
        { studentId: "s1", areaId, note: "Photo", url: "http://files.example/x.jpg" },
        areas,
      ),
    ).toThrow();
    const withUrl = upsertEyfsObservation(
      rows,
      { studentId: "s1", areaId, note: "Photo", url: "https://files.example/a.jpg" },
      areas,
    );
    expect(withUrl[1]?.url).toContain("https://");
    const hosted = upsertEyfsObservation(
      [],
      {
        studentId: "s1",
        areaId,
        note: "Hosted",
        url: "/api/v1/files/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      },
      areas,
    );
    expect(hosted[0]?.url).toContain("/api/v1/files/");
    const mixed = upsertEyfsObservation(
      withUrl,
      { studentId: "s2", areaId, note: "Other child" },
      areas,
    );
    expect(parentEyfs(mixed, "s1")).toHaveLength(2);
    expect(removeEyfsObservation(mixed, mixed[0]!.id)).toHaveLength(2);
    expect(eyfsAreaDeleteBlocked([], areaId)).toBe(false);
    expect(eyfsAreaDeleteBlocked(mixed, areaId)).toBe(true);
    expect(eyfsAreaDeleteBlocked(mixed, "missing")).toBe(false);
  });
});

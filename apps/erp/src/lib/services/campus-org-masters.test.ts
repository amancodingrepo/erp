import { describe, expect, it } from "vitest";
import { orgMasterDeleteBlocked, orgMasterPatchData } from "./campus-org-masters";

describe("org live masters", () => {
  it("blocks delete when related rows exist and maps name/code patches", () => {
    expect(orgMasterDeleteBlocked(0)).toBe(false);
    expect(orgMasterDeleteBlocked(2)).toBe(true);
    expect(
      orgMasterPatchData({ name: "Science", code: "SCI" }, { name: " Sci " }),
    ).toEqual({ name: "Sci" });
    expect(
      orgMasterPatchData({ name: "Science", code: "SCI" }, { code: "" }),
    ).toEqual({ name: "Science", code: null });
    expect(() =>
      orgMasterPatchData({ name: "Science", code: "SCI" }, { name: " " }),
    ).toThrow();
  });
});

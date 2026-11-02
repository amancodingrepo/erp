import { describe, expect, it } from "vitest";
import { hostelDeleteBlocked, hostelPatchData } from "./campus-housing";

describe("hostel item", () => {
  it("blocks delete when rooms exist and maps name/fee patches", () => {
    expect(hostelDeleteBlocked(0)).toBe(false);
    expect(hostelDeleteBlocked(1)).toBe(true);
    expect(hostelPatchData({ name: "Block A" }, { name: " Block B " })).toEqual({
      name: "Block B",
    });
    expect(hostelPatchData({ name: "Block A" }, { feeAmount: "1200" }).feeAmount?.toString()).toBe(
      "1200",
    );
    expect(() => hostelPatchData({ name: "Block A" }, { name: " " })).toThrow();
    expect(() => hostelPatchData({ name: "Block A" }, { feeAmount: "-1" })).toThrow();
  });
});

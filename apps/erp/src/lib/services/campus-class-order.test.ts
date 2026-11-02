import { describe, expect, it } from "vitest";
import { applyClassOrder } from "./campus-class-order";

describe("class reorder", () => {
  it("assigns sequence numbers from a live class id list and keeps unlisted classes after", () => {
    const live = ["c1", "c2", "c3", "c4"];
    expect(applyClassOrder(live, ["c3", "c1"])).toEqual([
      { id: "c3", sequenceNo: 0 },
      { id: "c1", sequenceNo: 1 },
      { id: "c2", sequenceNo: 2 },
      { id: "c4", sequenceNo: 3 },
    ]);
    expect(applyClassOrder(live, ["c4", "c3", "c2", "c1"]).map((row) => row.id)).toEqual([
      "c4",
      "c3",
      "c2",
      "c1",
    ]);
    expect(() => applyClassOrder(live, [])).toThrow();
    expect(() => applyClassOrder(live, ["missing"])).toThrow();
    expect(() => applyClassOrder(live, ["c1", "c1"])).toThrow();
  });
});

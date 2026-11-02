import { describe, expect, it } from "vitest";
import {
  attachHouseExtras,
  dropHouseExtra,
  houseDeleteBlocked,
  housePatchName,
  parseHouseExtras,
  upsertHouseExtra,
} from "./campus-house-extras";

describe("house extras", () => {
  it("stores a color and description on a live house", () => {
    const rows = upsertHouseExtra(parseHouseExtras([]), "h1", {
      color: "#ab4",
      description: "Courage",
    });
    expect(rows[0]).toMatchObject({
      houseId: "h1",
      color: "#AABB44",
      description: "Courage",
    });
    expect(upsertHouseExtra(rows, "h1", { description: "Valour" })).toHaveLength(1);
    expect(attachHouseExtras([{ id: "h1", name: "Red" }], rows)[0]).toMatchObject({
      color: "#AABB44",
      description: "Courage",
    });
    expect(() => upsertHouseExtra([], "h1", { color: "red" })).toThrow();
    expect(() => upsertHouseExtra([], " ", { color: "#fff" })).toThrow();
    expect(dropHouseExtra(rows, "h1")).toEqual([]);
    expect(dropHouseExtra(rows, "missing")).toEqual(rows);
    expect(houseDeleteBlocked(0)).toBe(false);
    expect(houseDeleteBlocked(2)).toBe(true);
    expect(housePatchName("Red", " Blue ")).toBe("Blue");
    expect(() => housePatchName("Red", " ")).toThrow();
  });
});

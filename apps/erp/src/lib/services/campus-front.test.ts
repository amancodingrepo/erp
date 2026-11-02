import { describe, expect, it } from "vitest";
import {
  hashPickupPin,
  parentCctvCameras,
  dropCctvCamera,
  parseCctvCameras,
  parsePickupAuth,
  patchCctvCameraRow,
  upsertCctvCamera,
  upsertPickupAuth,
  verifyPickupPin,
  visitorPatchData,
  frontOfficeTypeDeleteBlocked,
  frontOfficeTypePatchData,
} from "./campus-front";

const secret = "test-secret";

describe("pickup authorization", () => {
  it("stores a hashed pin and verifies it for the live student", () => {
    const rows = upsertPickupAuth(parsePickupAuth([]), {
      studentId: "s1",
      name: "Uncle Raj",
      phone: "99999",
      relation: "uncle",
      pin: "4821",
      secret,
    });
    expect(rows[0]?.pinHash).toBe(hashPickupPin("s1", "4821", secret));
    expect(verifyPickupPin(rows, "s1", "4821", secret)?.name).toBe("Uncle Raj");
    expect(verifyPickupPin(rows, "s1", "0000", secret)).toBeNull();
  });
});

describe("cctv cameras", () => {
  it("keeps https camera urls and hides them without consent", () => {
    const rows = upsertCctvCamera(parseCctvCameras([]), {
      name: "Daycare hall",
      room: "Hall",
      url: "https://cams.example/hall",
    });
    expect(rows[0]?.url).toContain("https://");
    expect(() =>
      upsertCctvCamera([], { name: "Bad", url: "http://cams.example/x" }),
    ).toThrow();
    expect(parentCctvCameras(rows, false)).toEqual([]);
    expect(parentCctvCameras(rows, true)).toHaveLength(1);
    expect(dropCctvCamera(rows, rows[0]!.id)).toEqual([]);
    expect(() => dropCctvCamera(rows, "missing")).toThrow();
    expect(
      patchCctvCameraRow(rows, rows[0]!.id, { room: " Lobby " })[0],
    ).toMatchObject({ id: rows[0]!.id, room: "Lobby" });
  });
});

describe("visitor patches", () => {
  it("maps optional fields to null when cleared", () => {
    expect(
      visitorPatchData(
        {
          name: "Ravi",
          phone: "1",
          purpose: "fees",
          toMeet: "office",
          note: "n",
        },
        { name: " Ravi K ", phone: "", toMeet: " principal " },
      ),
    ).toEqual({
      name: "Ravi K",
      phone: null,
      toMeet: "principal",
    });
    expect(() =>
      visitorPatchData(
        {
          name: "Ravi",
          phone: null,
          purpose: null,
          toMeet: null,
          note: null,
        },
        { name: " " },
      ),
    ).toThrow();
  });
});

describe("front office types", () => {
  it("maps name patches and blocks delete when related rows exist", () => {
    expect(frontOfficeTypeDeleteBlocked(0)).toBe(false);
    expect(frontOfficeTypeDeleteBlocked(1)).toBe(true);
    expect(
      frontOfficeTypePatchData({ name: "Walk-in" }, { name: " Walk in " }),
    ).toEqual({ name: "Walk in" });
    expect(() =>
      frontOfficeTypePatchData({ name: "Walk-in" }, { name: " " }),
    ).toThrow();
  });
});

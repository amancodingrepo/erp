import { describe, expect, it } from "vitest";
import {
  appendVehiclePing,
  attachStaffExtras,
  attachVehicleCompliance,
  attachVehicleExtras,
  dropVehicleRows,
  lastPingForVehicle,
  parseStaffExtras,
  parseVehicleCompliance,
  parseVehicleExtras,
  parseVehiclePings,
  upsertVehicleExtra,
  stopSequence,
  tripPlayback,
  upsertStaffExtra,
  upsertVehicleCompliance,
} from "./hr-transport";

describe("staff extras", () => {
  it("keeps one extras row per live staff id", () => {
    const first = parseStaffExtras([
      { staffId: "s1", category: "Driver", licenseNo: "DL-1", licenseExpiry: "2027-01-01" },
      { staffId: "  ", category: "Teacher" },
      null,
    ]);
    expect(first).toEqual([
      {
        staffId: "s1",
        category: "Driver",
        licenseNo: "DL-1",
        licenseExpiry: "2027-01-01",
        dob: "",
      },
    ]);
    const next = upsertStaffExtra(first, "s2", { category: "Teacher" });
    expect(next).toHaveLength(2);
    const attached = attachStaffExtras(
      [{ id: "s1", firstName: "Asha" }],
      next,
    );
    expect(attached[0].extra?.category).toBe("Driver");
    expect(attached[0].extra?.licenseNo).toBe("DL-1");
  });
});

describe("vehicle compliance", () => {
  it("attaches due dates onto live vehicles", () => {
    const rows = parseVehicleCompliance([
      {
        vehicleId: "v1",
        insuranceDue: "2026-12-01",
        fitnessDue: "2026-06-01",
        pucDue: "2026-03-01",
      },
    ]);
    const next = upsertVehicleCompliance(rows, "v2", {
      insuranceDue: "2027-01-01",
    });
    const attached = attachVehicleCompliance(
      [{ id: "v1", registrationNo: "MP-09" }],
      next,
    );
    expect(attached[0].compliance?.insuranceDue).toBe("2026-12-01");
    expect(attached[0].compliance?.fitnessDue).toBe("2026-06-01");
  });
});

describe("vehicle extras", () => {
  it("attaches tracker and capacity onto live vehicles", () => {
    const rows = parseVehicleExtras([
      { vehicleId: "v1", trackerId: "trk-1", capacity: 40, cctv: true, fuelType: "diesel" },
    ]);
    const next = upsertVehicleExtra(rows, "v2", { trackerId: "trk-2" });
    const attached = attachVehicleExtras([{ id: "v1", registrationNo: "MP-09" }], next);
    expect(attached[0].extras?.trackerId).toBe("trk-1");
    expect(attached[0].extras?.capacity).toBe(40);
    expect(attached[0].extras?.cctv).toBe(true);
    expect(next.find((row) => row.vehicleId === "v2")?.trackerId).toBe("trk-2");
    expect(dropVehicleRows(next, "v1").map((row) => row.vehicleId)).toEqual(["v2"]);
  });
});

describe("stopSequence", () => {
  it("orders live pickup names as the stop map", () => {
    expect(
      stopSequence([
        { name: "Gate", sortOrder: 2 },
        { name: "Depot", sortOrder: 0 },
        { name: "Market", sortOrder: 1 },
      ]),
    ).toEqual(["Depot", "Market", "Gate"]);
  });
});

describe("vehicle pings", () => {
  it("keeps last ping and trip points for a live vehicle", () => {
    const first = appendVehiclePing(parseVehiclePings([]), {
      vehicleId: "bus-1",
      lat: 28.61,
      lng: 77.2,
      at: "2026-04-01T07:00:00.000Z",
    });
    const second = appendVehiclePing(first.rows, {
      vehicleId: "bus-1",
      lat: 28.62,
      lng: 77.21,
      tripId: first.ping.tripId,
      at: "2026-04-01T07:10:00.000Z",
    });
    expect(lastPingForVehicle(second.rows, "bus-1")?.lat).toBe(28.62);
    expect(tripPlayback(second.rows, first.ping.tripId)).toHaveLength(2);
  });
});

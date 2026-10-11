import { describe, expect, it } from "vitest";
import {
  appendFuelLog,
  dropFuelLog,
  dropTransportSlab,
  feeForDistance,
  parseFuelLogs,
  parseTransportSlabs,
  patchTransportSlab,
  updateFuelLog,
  upsertTransportSlab,
} from "./campus-transport-ops";

describe("transport fuel logs and slabs", () => {
  it("appends a fuel fill for a vehicle and prices a named distance slab", () => {
    const logs = appendFuelLog(parseFuelLogs([]), {
      vehicleId: "bus-1",
      litres: 40,
      amount: 4200,
      odometer: 12010,
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ vehicleId: "bus-1", litres: 40, amount: 4200 });
    expect(() =>
      appendFuelLog([], { vehicleId: "bus-1", litres: 0, amount: 10 }),
    ).toThrow();
    expect(() =>
      appendFuelLog([], { vehicleId: " ", litres: 10, amount: 10 }),
    ).toThrow();

    const slabs = upsertTransportSlab(parseTransportSlabs([]), {
      name: "0-5 km",
      fromKm: 0,
      toKm: 5,
      amount: 800,
    });
    const next = upsertTransportSlab(slabs, {
      name: "Beyond 5 km",
      fromKm: 5.01,
      amount: 1500,
    });
    expect(feeForDistance(next, 3)).toBe(800);
    expect(feeForDistance(next, 12)).toBe(1500);
    expect(feeForDistance(next, -1)).toBeNull();
    expect(
      upsertTransportSlab(next, { name: "0-5 km", fromKm: 0, toKm: 5, amount: 900 }),
    ).toHaveLength(2);
    expect(() =>
      upsertTransportSlab([], { name: " ", fromKm: 0, amount: 1 }),
    ).toThrow();
    expect(() =>
      upsertTransportSlab([], { name: "Bad", fromKm: 10, toKm: 5, amount: 1 }),
    ).toThrow();
  });

  it("patches and drops a fuel fill and a named slab", () => {
    const logs = appendFuelLog(parseFuelLogs([]), {
      vehicleId: "bus-1",
      litres: 40,
      amount: 4200,
    });
    const logId = logs[0]!.id;
    const patched = updateFuelLog(logs, logId, { litres: 45, note: "top up" });
    expect(patched[0]).toMatchObject({
      id: logId,
      vehicleId: "bus-1",
      litres: 45,
      amount: 4200,
      note: "top up",
    });
    expect(dropFuelLog(patched, logId)).toEqual([]);
    expect(() => dropFuelLog(patched, "missing")).toThrow();
    expect(() => updateFuelLog(logs, logId, { litres: 0 })).toThrow();

    const slabs = upsertTransportSlab(parseTransportSlabs([]), {
      name: "0-5 km",
      fromKm: 0,
      toKm: 5,
      amount: 800,
    });
    const slabId = slabs[0]!.id;
    const next = patchTransportSlab(slabs, slabId, { amount: 900 });
    expect(next[0]).toMatchObject({ id: slabId, name: "0-5 km", amount: 900 });
    expect(dropTransportSlab(next, slabId)).toEqual([]);
    expect(() => dropTransportSlab(next, "missing")).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import {
  attachStopExtras,
  parseRouteStopExtras,
  parseStopWrite,
  parseStudentTransport,
  pickupReplacePlan,
  replaceRouteStopExtras,
} from "./campus-route-stops";

describe("parseStopWrite", () => {
  it("requires ordered stop names and keeps optional lat/lng/time", () => {
    expect(
      parseStopWrite({
        stops: [
          { name: " Depot ", lat: 23.2, lng: 77.4, time: "07:30" },
          "Market",
        ],
      }),
    ).toEqual([
      { name: "Depot", lat: 23.2, lng: 77.4, time: "07:30" },
      { name: "Market", lat: null, lng: null, time: "" },
    ]);
    expect(parseStopWrite(["Gate A"])).toEqual([
      { name: "Gate A", lat: null, lng: null, time: "" },
    ]);
    expect(parseStopWrite({ stops: [] })).toEqual([]);
    expect(() => parseStopWrite({})).toThrow();
    expect(() => parseStopWrite({ stops: [{ name: " " }] })).toThrow();
    expect(() => parseStopWrite({ stops: ["Depot", "depot"] })).toThrow();
    expect(() => parseStopWrite({ stops: [{ name: "A", time: "7am" }] })).toThrow();
  });

  it("clamps coordinates onto the globe", () => {
    expect(parseStopWrite({ stops: [{ name: "North", lat: 100, lng: -200 }] })).toEqual([
      { name: "North", lat: 90, lng: -180, time: "" },
    ]);
    expect(() => parseStopWrite({ stops: [{ name: "X", lat: "east" }] })).toThrow();
  });
});

describe("pickupReplacePlan", () => {
  it("keeps pickup ids by name, reorders, and refuses in-use deletes", () => {
    const existing = [
      { id: "p1", name: "Depot", riders: 1 },
      { id: "p2", name: "Market", riders: 0 },
    ];
    expect(pickupReplacePlan(existing, ["Market", "Gate", "Depot"])).toEqual({
      update: [
        { id: "p2", sortOrder: 0 },
        { id: "p1", sortOrder: 2 },
      ],
      create: [{ name: "Gate", sortOrder: 1 }],
      deleteIds: [],
    });
    expect(pickupReplacePlan(existing, ["Depot"])).toEqual({
      update: [{ id: "p1", sortOrder: 0 }],
      create: [],
      deleteIds: ["p2"],
    });
    expect(() => pickupReplacePlan(existing, ["Market"])).toThrow();
  });
});

describe("route stop extras", () => {
  it("replaces extras for one route and attaches them onto sequenced pickups", () => {
    const rows = parseRouteStopExtras([
      { routeId: "r1", name: "Depot", lat: 23.1, lng: 77.4, time: "07:15" },
      { routeId: "r2", name: "Other", lat: 1, lng: 2, time: "08:00" },
    ]);
    const next = replaceRouteStopExtras(rows, "r1", [
      { name: "Gate", lat: 23.25, lng: 77.41, time: "07:40" },
      { name: "Depot", lat: null, lng: null, time: "" },
    ]);
    expect(next).toEqual([
      { routeId: "r2", name: "Other", lat: 1, lng: 2, time: "08:00" },
      { routeId: "r1", name: "Gate", lat: 23.25, lng: 77.41, time: "07:40" },
    ]);
    expect(
      attachStopExtras(
        [
          { id: "p2", name: "Gate", sortOrder: 1 },
          { id: "p1", name: "Depot", sortOrder: 0 },
        ],
        next,
        "r1",
      ),
    ).toEqual([
      { id: "p1", name: "Depot", sortOrder: 0, lat: null, lng: null, time: "" },
      { id: "p2", name: "Gate", sortOrder: 1, lat: 23.25, lng: 77.41, time: "07:40" },
    ]);
  });
});

describe("parseStudentTransport", () => {
  it("accepts nested PUT fields and spec in/out aliases", () => {
    expect(
      parseStudentTransport({
        routeId: "r1",
        pickupPointId: "p1",
        outRouteId: "r2",
        outPickupPointId: "p2",
      }),
    ).toEqual({
      routeId: "r1",
      pickupPointId: "p1",
      outRouteId: "r2",
      outPickupPointId: "p2",
    });
    expect(
      parseStudentTransport({
        in_route: "r1",
        in_stop: "p1",
        out_route: "r2",
        out_stop: "p2",
      }),
    ).toEqual({
      routeId: "r1",
      pickupPointId: "p1",
      outRouteId: "r2",
      outPickupPointId: "p2",
    });
    expect(() => parseStudentTransport({ routeId: "r1" })).toThrow();
    expect(() =>
      parseStudentTransport({ routeId: "r1", pickupPointId: "p1", outRouteId: "r2" }),
    ).toThrow();
  });
});

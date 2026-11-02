import { describe, expect, it } from "vitest";
import {
  lookupAttendanceSource,
  parseAttendanceSource,
  parseAttendanceSources,
  sourceFingerprint,
  upsertAttendanceSources,
} from "./campus-attendance-source";

describe("parseAttendanceSource", () => {
  it("accepts manual, rfid, and gps and defaults to manual", () => {
    expect(parseAttendanceSource("RFID")).toBe("rfid");
    expect(parseAttendanceSource("gps")).toBe("gps");
    expect(parseAttendanceSource("manual")).toBe("manual");
    expect(parseAttendanceSource("")).toBe("manual");
    expect(parseAttendanceSource("swipe")).toBe("manual");
  });
});

describe("attendance source index", () => {
  it("stores swipe source by student/date/period and drops cleared rows", () => {
    const key = sourceFingerprint("s1", "2026-04-10", "");
    const rows = upsertAttendanceSources(
      [{ key: "old", source: "manual", at: "2020-01-01T00:00:00.000Z" }],
      {
        date: "2026-04-10",
        subjectId: "",
        marked: [{ studentId: "s1", source: "rfid" }],
        cleared: ["s2"],
        at: "2026-04-10T08:00:00.000Z",
      },
    );
    expect(lookupAttendanceSource(rows, "s1", "2026-04-10", "")).toBe("rfid");
    expect(rows.find((row) => row.key === key)?.at).toBe("2026-04-10T08:00:00.000Z");
    expect(lookupAttendanceSource(rows, "s2", "2026-04-10", "")).toBe("manual");
    expect(parseAttendanceSources([{ key, source: "gps" }])[0]?.source).toBe("gps");
  });
});

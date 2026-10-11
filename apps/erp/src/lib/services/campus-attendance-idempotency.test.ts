import { describe, expect, it } from "vitest";
import { HttpError } from "@/lib/errors";
import {
  fingerprintBody,
  lookupIdempotency,
  parseIdempotencyRecords,
  requireIdempotencyKey,
  storeIdempotencyRecord,
} from "./campus-attendance-idempotency";

describe("attendance idempotency", () => {
  it("requires Idempotency-Key", () => {
    expect(() =>
      requireIdempotencyKey(new Request("http://local/api", { method: "PUT" })),
    ).toThrow(HttpError);
    expect(
      requireIdempotencyKey(
        new Request("http://local/api", {
          method: "PUT",
          headers: { "Idempotency-Key": "  mark-1  " },
        }),
      ),
    ).toBe("mark-1");
  });

  it("fingerprints the same body regardless of key order", () => {
    const a = fingerprintBody({ date: "2026-08-10", entries: [{ studentId: "s1" }] });
    const b = fingerprintBody({ entries: [{ studentId: "s1" }], date: "2026-08-10" });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(
      fingerprintBody({ date: "2026-08-11", entries: [{ studentId: "s1" }] }),
    ).not.toBe(a);
  });

  it("replays the same key+fingerprint and conflicts on a different body", () => {
    const first = storeIdempotencyRecord(parseIdempotencyRecords([]), {
      key: "k1",
      fingerprint: "aaa",
      result: { saved: 1 },
      at: "2026-08-10T00:00:00.000Z",
    });
    expect(lookupIdempotency(first, "k1", "aaa")).toEqual({
      replay: { saved: 1 },
    });
    expect(lookupIdempotency(first, "k1", "bbb")).toEqual({ conflict: true });
    expect(lookupIdempotency(first, "k2", "aaa")).toEqual({ miss: true });
  });
});

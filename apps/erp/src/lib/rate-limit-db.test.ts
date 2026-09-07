import { describe, expect, it } from "vitest";
import { applyLoginHit } from "./rate-limit-db";

describe("login rate limit bucket", () => {
  const windowMs = 15 * 60 * 1000;
  const now = 1_000_000;

  it("allows the first five hits and blocks the sixth", () => {
    let row: { count: number; resetAt: number } | null = null;
    const hits = [];
    for (let i = 0; i < 6; i++) {
      const next = applyLoginHit(row, now, 5, windowMs);
      hits.push(next.limited);
      row = next.bucket;
    }
    expect(hits).toEqual([false, false, false, false, false, true]);
    expect(row?.count).toBe(6);
  });

  it("starts a new window after resetAt", () => {
    const expired = { count: 6, resetAt: now - 1 };
    const next = applyLoginHit(expired, now, 5, windowMs);
    expect(next.limited).toBe(false);
    expect(next.bucket.count).toBe(1);
  });
});

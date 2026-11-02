import { describe, expect, it } from "vitest";
import {
  hashOtp,
  issueOtpChallenge,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  parseOtpChallenges,
  verifyOtpChallenge,
} from "./otp";

const secret = "test-secret";

describe("otp challenges", () => {
  it("issues a hashed code and verifies once", () => {
    const issued = issueOtpChallenge([], {
      username: "parent1",
      portal: "parent",
      secret,
      now: 1_000,
      code: "123456",
    });
    expect(issued.code).toBe("123456");
    expect(issued.rows[0]?.hash).toBe(
      hashOtp({
        username: "parent1",
        portal: "parent",
        code: "123456",
        secret,
      }),
    );
    const ok = verifyOtpChallenge(issued.rows, {
      username: "parent1",
      portal: "parent",
      code: "123456",
      secret,
      now: 2_000,
    });
    expect(ok.ok).toBe(true);
    expect(ok.rows).toEqual([]);
  });

  it("rejects a wrong or expired code and drops after max attempts", () => {
    const issued = issueOtpChallenge(parseOtpChallenges([{ username: "x" }]), {
      username: "admin",
      portal: "staff",
      secret,
      now: 10,
      code: "000111",
    });
    const wrong = verifyOtpChallenge(issued.rows, {
      username: "admin",
      portal: "staff",
      code: "999999",
      secret,
      now: 11,
    });
    expect(wrong.ok).toBe(false);
    expect(wrong.rows[0]?.attempts).toBe(1);
    const expired = verifyOtpChallenge(issued.rows, {
      username: "admin",
      portal: "staff",
      code: "000111",
      secret,
      now: 10 + OTP_TTL_MS + 1,
    });
    expect(expired.ok).toBe(false);
    expect(expired.rows).toEqual([]);
    let rows = issued.rows;
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i += 1) {
      const next = verifyOtpChallenge(rows, {
        username: "admin",
        portal: "staff",
        code: "bad",
        secret,
        now: 12,
      });
      expect(next.ok).toBe(false);
      rows = next.rows;
    }
    expect(rows).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import {
  hmacSha256Base64,
  hmacSha256Hex,
  verifyCashfreeSignature,
  verifyRazorpaySignature,
} from "./gateway-signature";

describe("gateway signatures", () => {
  const body = '{"event":"payment.captured"}';

  it("accepts a valid Razorpay HMAC and rejects a bad one", () => {
    const secret = "whsec_test";
    const good = hmacSha256Hex(secret, body);
    expect(verifyRazorpaySignature(body, good, secret)).toBe(true);
    expect(verifyRazorpaySignature(body, "00".repeat(32), secret)).toBe(false);
    expect(verifyRazorpaySignature(body, good, "other")).toBe(false);
  });

  it("accepts Cashfree timestamped HMAC", () => {
    const secret = "cf_secret";
    const ts = "1710000000";
    const sig = hmacSha256Base64(secret, `${ts}${body}`);
    expect(verifyCashfreeSignature(body, sig, ts, secret)).toBe(true);
    expect(verifyCashfreeSignature(body, sig, "0", secret)).toBe(false);
  });
});

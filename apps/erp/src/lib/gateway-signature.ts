import { createHmac, timingSafeEqual } from "crypto";

export function hmacSha256Hex(secret: string, raw: string) {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export function hmacSha256Base64(secret: string, raw: string) {
  return createHmac("sha256", secret).update(raw).digest("base64");
}

function equal(expected: string, received: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Razorpay: HMAC-SHA256 hex of the raw body, keyed with webhook secret. */
export function verifyRazorpaySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
) {
  if (!signature || !secret) return false;
  return equal(hmacSha256Hex(secret, rawBody), signature);
}

/** Cashfree: HMAC-SHA256 base64 of `${timestamp}${rawBody}`. */
export function verifyCashfreeSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret: string,
) {
  if (!signature || !timestamp || !secret) return false;
  return equal(hmacSha256Base64(secret, `${timestamp}${rawBody}`), signature);
}

export function amountPaise(rupees: { toString(): string } | string | number) {
  return Math.round(Number(rupees) * 100);
}

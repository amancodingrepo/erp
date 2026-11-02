import { timingSafeEqual, randomBytes } from "crypto";
import { argon2idAsync } from "@noble/hashes/argon2.js";
import bcrypt from "bcryptjs";

const ARGON_T = 2;
const ARGON_M = 19456;
const ARGON_P = 1;
const ARGON_DKLEN = 32;
const ARGON_OPTS = {
  t: ARGON_T,
  m: ARGON_M,
  p: ARGON_P,
  dkLen: ARGON_DKLEN,
  maxmem: 64 * 1024 * 1024,
};

function phcB64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64").replace(/=+$/, "");
}

function fromPhcB64(text: string) {
  return new Uint8Array(Buffer.from(text, "base64"));
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const digest = await argon2idAsync(plain, salt, ARGON_OPTS);
  return `$argon2id$v=19$m=${ARGON_M},t=${ARGON_T},p=${ARGON_P}$${phcB64(salt)}$${phcB64(digest)}`;
}

export function passwordNeedsRehash(stored: string) {
  return !stored.startsWith("$argon2id$");
}

async function verifyArgon2id(plain: string, stored: string) {
  const match =
    /^\$argon2id\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(
      stored,
    );
  if (!match) return false;
  const salt = fromPhcB64(match[5]);
  const expected = fromPhcB64(match[6]);
  const digest = await argon2idAsync(plain, salt, {
    t: Number(match[3]),
    m: Number(match[2]),
    p: Number(match[4]),
    dkLen: expected.length,
    maxmem: 64 * 1024 * 1024,
  });
  if (digest.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(digest), Buffer.from(expected));
}

export async function verifyPassword(plain: string, stored: string) {
  if (stored.startsWith("$argon2id$")) {
    return verifyArgon2id(plain, stored);
  }
  return bcrypt.compare(plain, stored);
}

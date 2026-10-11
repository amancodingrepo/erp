import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { unauthenticated } from "@/lib/errors";
import { requireAuthSecret } from "@/lib/secrets";
import { findPortalUser, loadPrincipal } from "@/lib/principal";

export const OTP_KEY = "auth.otpChallenges";
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export type OtpChallenge = {
  username: string;
  portal: string;
  hash: string;
  expiresAt: number;
  attempts: number;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(input: {
  username: string;
  portal: string;
  code: string;
  secret: string;
}) {
  return createHmac("sha256", input.secret)
    .update(`${input.username}:${input.portal}:${input.code}`)
    .digest("hex");
}

export function otpHashEquals(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parseOtpChallenges(value: unknown): OtpChallenge[] {
  if (!Array.isArray(value)) return [];
  const out: OtpChallenge[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const username = trim(rec.username);
    const portal = trim(rec.portal);
    const hash = trim(rec.hash);
    const expiresAt = Number(rec.expiresAt);
    const attempts = Math.max(0, Math.trunc(Number(rec.attempts) || 0));
    const key = `${username}:${portal}`;
    if (!username || !portal || !hash || !Number.isFinite(expiresAt) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({ username, portal, hash, expiresAt, attempts });
  }
  return out;
}

export function issueOtpChallenge(
  rows: OtpChallenge[],
  input: {
    username: string;
    portal: string;
    secret: string;
    now: number;
    code?: string;
  },
) {
  const username = trim(input.username);
  const portal = trim(input.portal);
  const code = input.code ?? generateOtpCode();
  const next: OtpChallenge = {
    username,
    portal,
    hash: hashOtp({ username, portal, code, secret: input.secret }),
    expiresAt: input.now + OTP_TTL_MS,
    attempts: 0,
  };
  return {
    code,
    rows: [
      ...rows.filter((row) => !(row.username === username && row.portal === portal)),
      next,
    ],
  };
}

export function verifyOtpChallenge(
  rows: OtpChallenge[],
  input: {
    username: string;
    portal: string;
    code: string;
    secret: string;
    now: number;
  },
): { ok: boolean; rows: OtpChallenge[] } {
  const username = trim(input.username);
  const portal = trim(input.portal);
  const code = trim(input.code);
  const keyMatch = (row: OtpChallenge) =>
    row.username === username && row.portal === portal;
  const challenge = rows.find(keyMatch);
  const without = rows.filter((row) => !keyMatch(row));
  if (!challenge) return { ok: false, rows };
  if (challenge.expiresAt < input.now) return { ok: false, rows: without };
  const attempts = challenge.attempts + 1;
  const expected = hashOtp({
    username,
    portal,
    code,
    secret: input.secret,
  });
  if (otpHashEquals(expected, challenge.hash)) {
    return { ok: true, rows: without };
  }
  if (attempts >= OTP_MAX_ATTEMPTS) return { ok: false, rows: without };
  return {
    ok: false,
    rows: [...without, { ...challenge, attempts }],
  };
}

export function shouldEchoOtp() {
  return (
    process.env.ERP_OTP_ECHO === "1" || process.env.NODE_ENV === "test"
  );
}

async function readSetting(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: OTP_KEY } },
  });
  return row?.value;
}

async function writeSetting(campusId: string, value: Prisma.InputJsonValue) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: OTP_KEY } },
    update: { value },
    create: { campusId, key: OTP_KEY, value },
  });
}

export async function requestCampusOtp(input: {
  username: string;
  portal: string;
  campusCode?: string | null;
}) {
  const found = await findPortalUser(input);
  if (!found) return { sent: true as const };
  const secret = requireAuthSecret();
  const issued = issueOtpChallenge(parseOtpChallenges(await readSetting(found.campusId)), {
    username: found.username,
    portal: input.portal,
    secret,
    now: Date.now(),
  });
  await writeSetting(found.campusId, issued.rows);
  return shouldEchoOtp()
    ? { sent: true as const, debugCode: issued.code }
    : { sent: true as const };
}

export async function verifyCampusOtp(input: {
  username: string;
  portal: string;
  campusCode?: string | null;
  code: string;
}) {
  const found = await findPortalUser(input);
  if (!found) throw unauthenticated();
  const secret = requireAuthSecret();
  const result = verifyOtpChallenge(
    parseOtpChallenges(await readSetting(found.campusId)),
    {
      username: found.username,
      portal: input.portal,
      code: input.code,
      secret,
      now: Date.now(),
    },
  );
  await writeSetting(found.campusId, result.rows);
  if (!result.ok) throw unauthenticated();
  await prisma.user.update({
    where: { id: found.id },
    data: { lastLoginAt: new Date() },
  });
  return loadPrincipal(found.id, found.campusId);
}

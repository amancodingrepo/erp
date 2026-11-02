import { prisma } from "./db";

export type LoginBucket = { count: number; resetAt: number };

export function applyLoginHit(
  existing: LoginBucket | null,
  now: number,
  limit: number,
  windowMs: number,
): { bucket: LoginBucket; limited: boolean } {
  if (!existing || existing.resetAt < now) {
    return { bucket: { count: 1, resetAt: now + windowMs }, limited: false };
  }
  const count = existing.count + 1;
  return {
    bucket: { count, resetAt: existing.resetAt },
    limited: count > limit,
  };
}

export async function hitLoginRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000,
) {
  const now = Date.now();
  const row = await prisma.loginAttempt.findUnique({ where: { key } });
  const next = applyLoginHit(
    row ? { count: row.count, resetAt: row.resetAt.getTime() } : null,
    now,
    limit,
    windowMs,
  );
  await prisma.loginAttempt.upsert({
    where: { key },
    update: {
      count: next.bucket.count,
      resetAt: new Date(next.bucket.resetAt),
    },
    create: {
      key,
      count: next.bucket.count,
      resetAt: new Date(next.bucket.resetAt),
    },
  });
  return next.limited;
}

export async function clearLoginRateLimit(key: string) {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}

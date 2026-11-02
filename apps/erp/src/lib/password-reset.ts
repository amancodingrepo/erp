import { createHash, randomBytes } from "crypto";
import { prisma } from "./db";
import { notFound, validationError } from "./errors";
import { hashPassword } from "./password";

export const RESET_TTL_MS = 15 * 60 * 1000;

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newResetToken() {
  return randomBytes(32).toString("hex");
}

export async function randomPasswordHash() {
  return hashPassword(randomBytes(32).toString("hex"));
}

export async function issuePasswordReset(userId: string) {
  const token = newResetToken();
  await prisma.passwordReset.create({
    data: {
      userId,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  return token;
}

export async function consumePasswordReset(token: string, nextPassword: string) {
  if (nextPassword.length < 8) {
    throw validationError({ password: "min 8 characters" });
  }
  const row = await prisma.passwordReset.findFirst({
    where: {
      tokenHash: hashResetToken(token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!row) throw notFound("reset token");
  const passwordHash = await hashPassword(nextPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);
  return row.userId;
}

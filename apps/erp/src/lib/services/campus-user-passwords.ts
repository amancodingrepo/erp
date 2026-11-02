import { randomBytes } from "crypto";
import { ActorType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { forbidden, notFound, validationError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { AuthPrincipal } from "@/lib/permissions";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function newTemporaryPassword() {
  return `Erp@${randomBytes(4).toString("hex")}`;
}

export function resettableActor(actorType: string) {
  return (
    actorType === ActorType.STAFF ||
    actorType === ActorType.GUARDIAN ||
    actorType === ActorType.STUDENT
  );
}

export function parseOwnProfile(input: unknown) {
  if (!input || typeof input !== "object") {
    throw validationError({ profile: "required" });
  }
  const rec = input as Record<string, unknown>;
  if (!("email" in rec)) throw validationError({ email: "required" });
  const email = trim(rec.email);
  return { email: email || null };
}

export function parseOwnPassword(input: unknown) {
  if (!input || typeof input !== "object") {
    throw validationError({ password: "required" });
  }
  const rec = input as Record<string, unknown>;
  const current = trim(rec.current);
  const next = trim(rec.next);
  if (!current) throw validationError({ current: "required" });
  if (next.length < 8) throw validationError({ next: "min 8 characters" });
  return { current, next };
}

export async function resetCampusUserPassword(
  actor: AuthPrincipal,
  userId: string,
) {
  const target = await prisma.user.findFirst({
    where: { id: userId, campusId: actor.campusId },
    include: { roles: { include: { role: true } } },
  });
  if (!target) throw notFound("user");
  if (!resettableActor(target.actorType)) {
    throw forbidden("cannot reset this login");
  }
  const isSuper = target.roles.some((row) => row.role.name === "SuperAdmin");
  if (isSuper && !actor.roles.includes("SuperAdmin")) {
    throw forbidden("cannot reset SuperAdmin");
  }
  const temporaryPassword = newTemporaryPassword();
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash: await hashPassword(temporaryPassword) },
  });
  return {
    id: target.id,
    username: target.username,
    actorType: target.actorType,
    temporaryPassword,
  };
}

export async function saveOwnProfile(userId: string, input: unknown) {
  const body = parseOwnProfile(input);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: body.email },
    select: { id: true, email: true, username: true },
  });
  return updated;
}

export async function changeOwnPassword(userId: string, input: unknown) {
  const body = parseOwnPassword(input);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("user");
  const matches = await verifyPassword(body.current, user.passwordHash);
  if (!matches) throw validationError({ current: "incorrect password" });
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.next) },
  });
  return { ok: true };
}

import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  );
}

export async function writeAudit(input: {
  userId?: string | null;
  campusId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  ip?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      campusId: input.campusId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
      ip: input.ip ?? null,
    },
  });
}

import { PrismaClient } from "@prisma/client";
import { guardTenant } from "./tenant-guard";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makePrisma() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  return guardTenant(base);
}

export const prisma = globalForPrisma.prisma ?? makePrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

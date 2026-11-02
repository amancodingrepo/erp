import { NextResponse } from "next/server";
import { fieldEncryptionKeyBytes } from "@/lib/crypto";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    if (process.env.NODE_ENV === "production") {
      fieldEncryptionKeyBytes();
    }
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up" });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}

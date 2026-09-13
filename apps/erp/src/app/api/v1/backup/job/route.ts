import { timingSafeEqual } from "node:crypto";
import { requestIp, writeAudit } from "@/lib/audit";
import { createDbDump } from "@/lib/db-backup";
import { unauthenticated } from "@/lib/errors";
import { fail, ok } from "@/lib/http";

function bearerOk(header: string | null, expected: string) {
  const got = header?.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    const expected = process.env.BACKUP_JOB_TOKEN ?? "";
    if (expected.length < 16) throw unauthenticated();
    if (!bearerOk(request.headers.get("authorization"), expected)) {
      throw unauthenticated();
    }
    const dump = await createDbDump();
    await writeAudit({
      campusId: null,
      action: "backup",
      entity: "database",
      entityId: dump.name,
      ip: requestIp(request),
    });
    return ok({ ok: true, dump: { name: dump.name } });
  } catch (error) {
    return fail(error);
  }
}

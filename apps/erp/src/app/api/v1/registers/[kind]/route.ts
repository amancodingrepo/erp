import { requestIp, writeAudit } from "@/lib/audit";
import { created, fail, ok, readJson } from "@/lib/http";
import { assertStaff, requireApiPermission } from "@/lib/principal";
import { registerKind } from "@/lib/services/registers";
import { createRegister, listRegister } from "@/lib/services/registers-store";

type Context = { params: Promise<{ kind: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const def = registerKind((await context.params).kind);
    const user = await requireApiPermission(request, ...def.view);
    assertStaff(user);
    return ok({ data: await listRegister(user.campusId, def) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const def = registerKind((await context.params).kind);
    const user = await requireApiPermission(request, ...def.write);
    assertStaff(user);
    const row = await createRegister(user.campusId, def, await readJson<Record<string, unknown>>(request));
    await writeAudit({ userId: user.id, campusId: user.campusId, action: "create", entity: "register:" + def.kind, entityId: row.id, after: row as never, ip: requestIp(request) });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

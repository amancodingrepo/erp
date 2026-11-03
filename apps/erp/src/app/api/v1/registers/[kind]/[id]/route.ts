import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { assertStaff, requireApiPermission } from "@/lib/principal";
import { registerKind } from "@/lib/services/registers";
import { deleteRegister, updateRegister } from "@/lib/services/registers-store";

type Context = { params: Promise<{ kind: string; id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { kind, id } = await context.params;
    const def = registerKind(kind);
    const user = await requireApiPermission(request, ...def.write);
    assertStaff(user);
    const { before, after } = await updateRegister(user.campusId, def, id, await readJson<Record<string, unknown>>(request));
    await writeAudit({ userId: user.id, campusId: user.campusId, action: "update", entity: "register:" + def.kind, entityId: id, before: before as never, after: after as never, ip: requestIp(request) });
    return ok(after);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { kind, id } = await context.params;
    const def = registerKind(kind);
    const user = await requireApiPermission(request, ...def.write);
    assertStaff(user);
    const row = await deleteRegister(user.campusId, def, id);
    await writeAudit({ userId: user.id, campusId: user.campusId, action: "delete", entity: "register:" + def.kind, entityId: id, before: row as never, ip: requestIp(request) });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

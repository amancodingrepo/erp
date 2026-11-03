import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

type Context = { params: Promise<{ id: string }> };
const patchSchema = z.object({ name: z.string().trim().min(1).max(120) });

async function findInCampus(campusId: string, id: string) {
  const row = await prisma.specialization.findFirst({ where: { id, program: { department: { campusId } } } });
  if (!row) throw notFound("specialization");
  return row;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireApiPermission(request, "academics", "program", "create");
    const before = await findInCampus(user.campusId, (await context.params).id);
    const body = patchSchema.parse(await readJson(request));
    const clash = await prisma.specialization.findFirst({
      where: { programId: before.programId, id: { not: before.id }, name: { equals: body.name, mode: "insensitive" } },
    });
    if (clash) throw conflict("this program already has that specialization");
    const row = await prisma.specialization.update({ where: { id: before.id }, data: { name: body.name } });
    await writeAudit({ userId: user.id, campusId: user.campusId, action: "update", entity: "specialization", entityId: row.id, before, after: row, ip: requestIp(request) });
    return ok(row);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireApiPermission(request, "academics", "program", "create");
    const row = await findInCampus(user.campusId, (await context.params).id);
    const used = await prisma.section.count({ where: { specializationId: row.id } });
    if (used) {
      throw conflict(used === 1 ? "1 section is assigned to this specialization; unassign it first" : used + " sections are assigned to this specialization; unassign them first");
    }
    await prisma.specialization.delete({ where: { id: row.id } });
    await writeAudit({ userId: user.id, campusId: user.campusId, action: "delete", entity: "specialization", entityId: row.id, before: row, ip: requestIp(request) });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

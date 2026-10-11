import { prisma } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachFeeMasterInstallments,
  dropMasterInstallmentsByMaster,
  listMasterInstallments,
  saveMasterInstallments,
} from "@/lib/services/campus-fee-installments";
import { parseFeeTemplatePatch } from "@/lib/services/campus-spec-aliases";

const templateInclude = {
  group: true,
  lines: { include: { feeType: true } },
} as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const { id } = await context.params;
    const row = await prisma.feeMaster.findFirst({
      where: { id, campusId: user.campusId },
      include: templateInclude,
    });
    if (!row) throw notFound("fee template");
    const [attached] = await attachFeeMasterInstallments(user.campusId, [row]);
    return ok(attached);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const { id } = await context.params;
    const existing = await prisma.feeMaster.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("fee template");
    const body = parseFeeTemplatePatch(await readJson(request));
    if (body.sessionId) {
      const session = await prisma.academicSession.findFirst({
        where: { id: body.sessionId, campusId: user.campusId },
        select: { id: true },
      });
      if (!session) throw notFound("session");
    }
    if (body.groupId) {
      const group = await prisma.feeGroup.findFirst({
        where: { id: body.groupId, campusId: user.campusId },
        select: { id: true },
      });
      if (!group) throw notFound("fee group");
    }
    const row = await prisma.feeMaster.update({
      where: { id },
      data: {
        ...(body.sessionId ? { sessionId: body.sessionId } : {}),
        ...(body.groupId ? { groupId: body.groupId } : {}),
        ...(body.dueDate !== undefined
          ? { dueDate: body.dueDate ? new Date(body.dueDate) : null }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      include: templateInclude,
    });
    const [attached] = await attachFeeMasterInstallments(user.campusId, [row]);
    return ok(attached);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const { id } = await context.params;
    const existing = await prisma.feeMaster.findFirst({
      where: { id, campusId: user.campusId },
      include: { _count: { select: { invoices: true } } },
    });
    if (!existing) throw notFound("fee template");
    if (existing._count.invoices > 0) throw conflict("fee template is in use");
    await prisma.feeMasterLine.deleteMany({ where: { masterId: id } });
    await prisma.feeMaster.delete({ where: { id } });
    const mappings = dropMasterInstallmentsByMaster(
      await listMasterInstallments(user.campusId),
      id,
    );
    await saveMasterInstallments(user.campusId, mappings);
    return ok({ data: { id, deleted: true } });
  } catch (error) {
    return fail(error);
  }
}

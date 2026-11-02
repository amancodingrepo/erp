import { z } from "zod";
import { prisma } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachFeeTypeExtras,
  listFeeTypeExtras,
  purgeFeeTypeExtra,
  saveFeeTypeExtra,
} from "@/lib/services/campus-fee-type-extras";

const bodySchema = z.object({
  isRefundable: z.boolean().optional(),
  cgst: z.boolean().optional(),
  sgst: z.boolean().optional(),
  igst: z.boolean().optional(),
  visible: z.boolean().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const { id } = await context.params;
    const row = await prisma.feeType.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!row) throw notFound("fee type");
    const extras = await listFeeTypeExtras(user.campusId);
    return ok({ data: attachFeeTypeExtras([row], extras)[0] });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const extra = await saveFeeTypeExtra(user.campusId, id, body);
    const row = await prisma.feeType.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!row) throw notFound("fee type");
    return ok({ data: attachFeeTypeExtras([row], [extra])[0] });
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
    const existing = await prisma.feeType.findFirst({
      where: { id, campusId: user.campusId },
      include: { _count: { select: { lines: true, invoiceLines: true } } },
    });
    if (!existing) throw notFound("fee type");
    if (existing._count.lines > 0 || existing._count.invoiceLines > 0) {
      throw conflict("fee type is in use");
    }
    await prisma.feeType.delete({ where: { id } });
    await purgeFeeTypeExtra(user.campusId, id);
    return ok({ data: { id, deleted: true } });
  } catch (error) {
    return fail(error);
  }
}

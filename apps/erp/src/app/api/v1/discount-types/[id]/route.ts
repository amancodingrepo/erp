import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseDiscountTypePatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const { id } = await context.params;
    const row = await prisma.feeDiscount.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!row) throw notFound("discount type");
    return ok(row);
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
    const existing = await prisma.feeDiscount.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("discount type");
    const body = parseDiscountTypePatch(await readJson(request));
    const row = await prisma.feeDiscount.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.kind ? { kind: body.kind } : {}),
        ...(body.code !== undefined ? { code: body.code } : {}),
        ...(body.percentage !== undefined ? { percentage: body.percentage } : {}),
        ...(body.amount !== undefined ? { amount: body.amount } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
    });
    return ok(row);
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
    const existing = await prisma.feeDiscount.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("discount type");
    await prisma.feeDiscount.delete({ where: { id } });
    return ok({ data: { id, deleted: true } });
  } catch (error) {
    return fail(error);
  }
}

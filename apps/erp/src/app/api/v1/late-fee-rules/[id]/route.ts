import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachLateFeeRules,
  parseLateFeeRulePatch,
} from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const { id } = await context.params;
    const row = await prisma.fineRule.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!row) throw notFound("late fee rule");
    return ok(attachLateFeeRules([row])[0]);
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
    const existing = await prisma.fineRule.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("late fee rule");
    const body = parseLateFeeRulePatch(await readJson(request));
    const row = await prisma.fineRule.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.afterDays !== undefined ? { afterDays: body.afterDays } : {}),
        ...(body.kind ? { kind: body.kind } : {}),
        ...(body.value !== undefined ? { value: body.value } : {}),
      },
    });
    return ok(attachLateFeeRules([row])[0]);
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
    const existing = await prisma.fineRule.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("late fee rule");
    await prisma.fineRule.delete({ where: { id } });
    return ok({ data: { id, deleted: true } });
  } catch (error) {
    return fail(error);
  }
}

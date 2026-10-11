import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseFeeTemplateLine } from "@/lib/services/campus-spec-aliases";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const { id } = await context.params;
    const master = await prisma.feeMaster.findFirst({
      where: { id, campusId: user.campusId },
      select: { id: true },
    });
    if (!master) throw notFound("fee template");
    const line = parseFeeTemplateLine(await readJson(request));
    const row = await prisma.feeMasterLine.create({
      data: {
        masterId: master.id,
        feeTypeId: line.feeTypeId,
        amount: line.amount,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

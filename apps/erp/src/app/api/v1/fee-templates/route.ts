import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { attachFeeMasterInstallments } from "@/lib/services/campus-fee-installments";
import { parseFeeTemplate } from "@/lib/services/campus-spec-aliases";
import { createFeeMastersFromInstallments } from "@/lib/services/fees";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    const data = await prisma.feeMaster.findMany({
      where: {
        campusId: user.campusId,
        ...(sessionId ? { sessionId } : {}),
      },
      include: { group: true, lines: { include: { feeType: true } } },
      orderBy: { dueDate: "asc" },
    });
    return ok({ data: await attachFeeMasterInstallments(user.campusId, data) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "create");
    const body = parseFeeTemplate(await readJson(request));
    if (body.lines.some((line) => line.dueDate || line.installmentId)) {
      const rows = await createFeeMastersFromInstallments({
        campusId: user.campusId,
        sessionId: body.sessionId,
        groupId: body.groupId,
        lines: body.lines,
      });
      return created({ data: rows, created: rows.length });
    }
    const row = await prisma.feeMaster.create({
      data: {
        campusId: user.campusId,
        sessionId: body.sessionId,
        groupId: body.groupId,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        lines: {
          create: body.lines.map((line) => ({
            feeTypeId: line.feeTypeId,
            amount: line.amount,
          })),
        },
      },
      include: { lines: true, group: true },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

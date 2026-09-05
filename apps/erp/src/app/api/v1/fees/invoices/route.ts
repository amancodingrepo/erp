import { InvoiceStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const bodySchema = z.object({
  studentId: z.string(),
  sessionId: z.string(),
  masterId: z.string(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "collect");
    const body = bodySchema.parse(await readJson(request));
    const master = await prisma.feeMaster.findFirst({
      where: { id: body.masterId, campusId: user.campusId },
      include: { lines: { include: { feeType: true } } },
    });
    if (!master) throw notFound("fee master");
    const total = master.lines.reduce((sum, line) => sum + Number(line.amount), 0);
    const invoice = await prisma.feeInvoice.create({
      data: {
        studentId: body.studentId,
        sessionId: body.sessionId,
        masterId: master.id,
        status: InvoiceStatus.DUE,
        total,
        lines: {
          create: master.lines.map((line) => ({
            feeTypeId: line.feeTypeId,
            description: line.feeType.name,
            amount: line.amount,
          })),
        },
      },
      include: { lines: true },
    });
    return created(invoice);
  } catch (error) {
    return fail(error);
  }
}

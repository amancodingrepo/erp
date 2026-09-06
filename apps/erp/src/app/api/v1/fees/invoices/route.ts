import { InvoiceStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { ZERO } from "@/lib/money";
import { requireApiPermission } from "@/lib/principal";
import { listInvoices } from "@/lib/services/fees";

const bodySchema = z.object({
  studentId: z.string(),
  sessionId: z.string(),
  masterId: z.string(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "view");
    const params = new URL(request.url).searchParams;
    return ok(
      await listInvoices({
        campusId: user.campusId,
        studentId: params.get("studentId") ?? undefined,
        enrollmentId: params.get("enrollmentId") ?? undefined,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "fees",
      "collect",
      "collect",
    );
    const body = bodySchema.parse(await readJson(request));
    const master = await prisma.feeMaster.findFirst({
      where: { id: body.masterId, campusId: user.campusId },
      include: { lines: { include: { feeType: true } } },
    });
    if (!master) throw notFound("fee master");
    const student = await prisma.student.findFirst({
      where: { id: body.studentId, campusId: user.campusId },
    });
    if (!student) throw notFound("student");
    const total = master.lines.reduce((sum, line) => sum.plus(line.amount), ZERO);
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
            dueDate: master.dueDate,
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

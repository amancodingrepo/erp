import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { ownStudentsFilter } from "@/lib/school-world-shape";
import { feeLineInclude, schoolFee } from "@/lib/school-world-fees";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const url = new URL(request.url);
    const studentCode = url.searchParams.get("studentCode");
    const lines = await prisma.feeInvoiceLine.findMany({
      where: {
        invoice: {
          student: {
            campusId: user.campusId,
            ...ownStudentsFilter(user),
            ...(studentCode ? { admissionNo: studentCode } : {}),
          },
        },
      },
      include: feeLineInclude,
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      take: 2000,
    });
    return ok({ fees: lines.map(schoolFee) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST() {
  return fail(new HttpError(400, "validation_error", "Add a fee from a fee master. Free-typed fee rows are turned off."));
}

import { prisma } from "@/lib/db";
import { fail, ok, readJson } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { parseSearchPeople } from "@/lib/services/campus-spec-aliases";
import { searchPeople } from "@/lib/services/directory";

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const body = parseSearchPeople(await readJson(request));
    const people = await searchPeople(user.campusId, body);
    const q = body.q?.trim() ?? "";
    const receipts =
      q.length >= 2
        ? await prisma.payment.findMany({
            where: {
              receiptNo: { contains: q, mode: "insensitive" },
              invoice: { student: { campusId: user.campusId } },
            },
            take: 8,
            include: { invoice: { include: { student: true } } },
            orderBy: { paidAt: "desc" },
          })
        : [];
    return ok({
      students: people.students,
      receipts: receipts.map((p) => ({
        receiptNo: p.receiptNo,
        student: [p.invoice.student.firstName, p.invoice.student.lastName]
          .filter(Boolean)
          .join(" "),
        href: `/staff/studentfee/feereceipt?receiptNo=${encodeURIComponent(p.receiptNo)}`,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

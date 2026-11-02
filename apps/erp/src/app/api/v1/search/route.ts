import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { searchPeople } from "@/lib/services/directory";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const people = await searchPeople(user.campusId, {
      q: q || undefined,
      firstName: url.searchParams.get("firstName") ?? undefined,
      lastName: url.searchParams.get("lastName") ?? undefined,
      phone: url.searchParams.get("phone") ?? undefined,
      email: url.searchParams.get("email") ?? undefined,
      id: url.searchParams.get("id") ?? undefined,
      exact: url.searchParams.get("exact") === "1",
      toFees: url.searchParams.get("to") === "fees",
    });
    if (q.length < 2 && !url.searchParams.get("firstName") && !url.searchParams.get("id")) {
      return ok({ students: people.students, receipts: [] });
    }
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

import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return ok({ students: [], receipts: [] });
    }
    const students = await prisma.student.findMany({
      where: {
        campusId: user.campusId,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { admissionNo: { contains: q, mode: "insensitive" } },
          { enrollmentNo: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      orderBy: { lastName: "asc" },
    });
    const receipts = await prisma.payment.findMany({
      where: {
        receiptNo: { contains: q, mode: "insensitive" },
        invoice: { student: { campusId: user.campusId } },
      },
      take: 8,
      include: { invoice: { include: { student: true } } },
      orderBy: { paidAt: "desc" },
    });
    return ok({
      students: students.map((s) => ({
        id: s.id,
        admissionNo: s.admissionNo,
        name: [s.firstName, s.lastName].filter(Boolean).join(" "),
        href: `/staff/students/${s.id}`,
      })),
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

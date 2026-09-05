import { AttendanceStatus, InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "dashboard",
      "home",
      "view",
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [students, collected, present, marked] = await Promise.all([
      prisma.student.count({
        where: { campusId: user.campusId, status: "ACTIVE" },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          cancelledAt: null,
          invoice: { student: { campusId: user.campusId } },
        },
      }),
      prisma.studentAttendance.count({
        where: {
          date: today,
          status: AttendanceStatus.PRESENT,
          student: { campusId: user.campusId },
        },
      }),
      prisma.studentAttendance.count({
        where: {
          date: today,
          student: { campusId: user.campusId },
        },
      }),
    ]);
    const due = await prisma.feeInvoice.aggregate({
      _sum: { total: true, paid: true },
      where: {
        status: { in: [InvoiceStatus.DUE, InvoiceStatus.PARTIAL] },
        student: { campusId: user.campusId },
      },
    });
    return ok({
      students,
      feeCollected: Number(collected._sum.amount ?? 0),
      feeDue: Number(due._sum.total ?? 0) - Number(due._sum.paid ?? 0),
      attendanceToday: {
        present,
        marked,
        percent: marked ? Math.round((present / marked) * 100) : 0,
      },
    });
  } catch (error) {
    return fail(error);
  }
}

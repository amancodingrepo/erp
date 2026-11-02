import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { attendanceDashboard } from "@/lib/services/directory";
import { enrollmentScope, viewingSessionId } from "@/lib/services/session-context";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "dashboard",
      "home",
      "view",
    );
    const sessionId = await viewingSessionId(request, user);
    const [students, collected, attendanceToday] = await Promise.all([
      prisma.student.count({
        where: {
          campusId: user.campusId,
          status: "ACTIVE",
          enrollments: { some: enrollmentScope(sessionId) },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          cancelledAt: null,
          invoice: { student: { campusId: user.campusId } },
        },
      }),
      attendanceDashboard(user.campusId, undefined, sessionId),
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
      attendanceToday,
    });
  } catch (error) {
    return fail(error);
  }
}

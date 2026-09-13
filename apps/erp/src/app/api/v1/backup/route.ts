import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "backup",
      "edit",
    );
    const campusId = user.campusId;
    const [
      campus,
      students,
      staff,
      invoices,
      payments,
      applications,
      audit,
    ] = await Promise.all([
      prisma.campus.findUnique({
        where: { id: campusId },
        include: { org: true },
      }),
      prisma.student.count({ where: { campusId } }),
      prisma.staff.count({ where: { campusId } }),
      prisma.feeInvoice.count({
        where: { student: { campusId } },
      }),
      prisma.payment.count({
        where: { invoice: { student: { campusId } } },
      }),
      prisma.application.count({ where: { campusId } }),
      prisma.auditLog.findMany({
        where: { campusId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          createdAt: true,
          userId: true,
        },
      }),
    ]);
    return ok({
      generatedAt: new Date().toISOString(),
      campus: campus
        ? {
            id: campus.id,
            name: campus.name,
            code: campus.code,
            org: campus.org.name,
          }
        : null,
      counts: { students, staff, invoices, payments, applications },
      recentAudit: audit,
      note: "This is a campus snapshot, not a Postgres dump. Keep Railway volume backups for the database.",
    });
  } catch (error) {
    return fail(error);
  }
}

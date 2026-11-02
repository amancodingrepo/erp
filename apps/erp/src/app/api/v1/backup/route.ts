import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createDbDump, listDbDumps } from "@/lib/db-backup";
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
    const dumps = await listDbDumps();
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
      dumps,
      dumpJob:
        "pg_dump custom format on the uploads volume; keeps last 7; also runs daily in production",
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "backup",
      "edit",
    );
    const dump = await createDbDump();
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "backup",
      entity: "database",
      entityId: dump.name,
      ip: requestIp(request),
    });
    return ok({ ok: true, dump });
  } catch (error) {
    return fail(error);
  }
}

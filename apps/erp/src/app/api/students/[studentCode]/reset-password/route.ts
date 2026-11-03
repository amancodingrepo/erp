import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { requireSchoolAdmin, resetUserPassword } from "@/lib/school-world-bridge";

/** New temporary password for a student's portal login; they must change it at next sign-in. */
export async function POST(request: Request, context: { params: Promise<{ studentCode: string }> }) {
  try {
    const user = await requireSchoolAdmin(request);
    const code = decodeURIComponent((await context.params).studentCode);
    const student = await prisma.student.findFirst({ where: { campusId: user.campusId, admissionNo: code }, select: { id: true, userId: true } });
    if (!student) throw notFound("Student");
    if (!student.userId) throw conflict("This student has no portal login yet.");
    const result = await resetUserPassword(user.campusId, student.userId);
    await writeAudit({ userId: user.id, campusId: user.campusId, action: "reset-password", entity: "Student", entityId: student.id, ip: requestIp(request) });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

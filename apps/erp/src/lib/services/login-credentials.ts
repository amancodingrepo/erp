import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { validationError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { emailChannelReady, sendPortalLoginEmail } from "@/lib/services/messages";

export type CredentialResult = {
  studentId: string;
  admissionNo: string;
  name: string;
  portal: "student" | "parent";
  to: string | null;
  status: "sent" | "skipped" | "failed";
  reason?: string;
};

const tempPassword = () => `Portal@${randomBytes(4).toString("hex")}`;

/**
 * Emails a fresh temporary password to each selected student's (and/or parent's) existing portal login.
 * A password is only changed after its email was delivered, so nobody is locked out by a mail that
 * never left the system. Students with no login or no email address are reported, not changed.
 */
export async function sendLoginCredentials(input: {
  campusId: string;
  studentIds: string[];
  portals: Array<"student" | "parent">;
}) {
  if (!(await emailChannelReady(input.campusId))) {
    throw validationError({ email: "Email is not set up for this campus. Add the mail server in Email settings first, so new passwords are not lost." });
  }
  const campus = await prisma.campus.findUnique({ where: { id: input.campusId }, select: { code: true, name: true } });
  const students = await prisma.student.findMany({
    where: { id: { in: [...new Set(input.studentIds)] }, campusId: input.campusId },
    include: { user: { select: { id: true, username: true, isActive: true } }, guardians: { include: { guardian: { include: { user: { select: { id: true, username: true, isActive: true } } } } } } },
  });
  const results: CredentialResult[] = [];
  const unknown = input.studentIds.filter((id) => !students.some((row) => row.id === id));
  if (unknown.length) throw validationError({ studentIds: unknown.length + " selected student(s) are not in this campus" });

  for (const student of students) {
    const name = [student.firstName, student.lastName].filter(Boolean).join(" ");
    const base = { studentId: student.id, admissionNo: student.admissionNo, name };
    const targets: Array<{ portal: "student" | "parent"; user: { id: string; username: string | null; isActive: boolean } | null; to: string | null; who: string }> = [];
    if (input.portals.includes("student")) targets.push({ portal: "student", user: student.user, to: student.email, who: name });
    if (input.portals.includes("parent")) {
      const link = student.guardians.find((g) => g.guardian.user) ?? student.guardians[0];
      targets.push({ portal: "parent", user: link?.guardian.user ?? null, to: link?.guardian.email ?? null, who: link?.guardian.name ?? "Parent" });
    }
    for (const target of targets) {
      const row = { ...base, portal: target.portal, to: target.to?.trim() || null };
      if (!target.user || !target.user.username) { results.push({ ...row, status: "skipped", reason: "no " + target.portal + " login yet" }); continue; }
      if (!target.user.isActive) { results.push({ ...row, status: "skipped", reason: "login is disabled" }); continue; }
      if (!row.to) { results.push({ ...row, status: "skipped", reason: "no email address" }); continue; }
      const password = tempPassword();
      let status: string;
      try {
        status = await sendPortalLoginEmail({
          campusId: input.campusId, studentId: student.id, to: row.to, name: target.who, portal: target.portal,
          username: target.user.username, password, admissionNo: student.admissionNo,
          campusName: campus?.name ?? "Campus", campusCode: campus?.code ?? "MAIN",
        });
      } catch {
        status = "failed";
      }
      if (status !== "sent") { results.push({ ...row, status: "failed", reason: "email was not delivered; password unchanged" }); continue; }
      await prisma.user.update({ where: { id: target.user.id }, data: { passwordHash: await hashPassword(password) } });
      results.push({ ...row, status: "sent" });
    }
  }
  return {
    sent: results.filter((r) => r.status === "sent").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
}

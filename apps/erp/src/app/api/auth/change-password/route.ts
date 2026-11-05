import { campusSummary } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/password";
import { principalFromRequest } from "@/lib/principal";
import { schoolWorldUser } from "@/lib/school-world-shape";
import { schoolBranding } from "@/lib/school-branding";

export async function POST(request: Request) {
  try {
    const principal = await principalFromRequest(request);
    const body = await readJson<{ currentPassword?: string; newPassword?: string }>(request);
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (newPassword.length < 12) {
      throw new HttpError(400, "validation_error", "Use a new password with at least 12 characters.");
    }
    if (currentPassword === newPassword) {
      throw new HttpError(400, "validation_error", "Choose a password different from the current password.");
    }
    const account = await prisma.user.findUnique({ where: { id: principal.id } });
    if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
      throw new HttpError(400, "validation_error", "Current password is incorrect.");
    }
    const passwordHash = await hashPassword(newPassword);
    const updated = await prisma.user.update({
      where: { id: account.id },
      data: { passwordHash, mustChangePassword: false },
    });
    const campus = await campusSummary(principal.campusId);
    return ok({ user: schoolWorldUser(principal, updated, campus, await schoolBranding(principal.campusId)) });
  } catch (error) {
    return fail(error);
  }
}

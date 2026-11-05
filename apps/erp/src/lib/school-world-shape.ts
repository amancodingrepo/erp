import { forbidden } from "./errors";
import type { AuthPrincipal } from "./permissions";

export function assertCampusStaff(principal: AuthPrincipal) {
  if (principal.actorType === "STUDENT" || principal.actorType === "GUARDIAN" || principal.actorType === "APPLICANT") {
    throw forbidden("This action is for campus staff.");
  }
}

export function schoolWorldRole(principal: AuthPrincipal) {
  const names = principal.roles.map((role) => role.toLowerCase());
  if (principal.actorType === "STUDENT") return "student";
  if (principal.actorType === "GUARDIAN") return "parent";
  if (names.some((name) => name.includes("principal"))) return "principal";
  if (names.some((name) => name.includes("admin"))) return "school_admin";
  if (names.some((name) => name.includes("teacher"))) return "teacher";
  return "staff";
}

export function schoolWorldUser(
  principal: AuthPrincipal,
  account: { email: string | null; username: string; firstName: string; lastName: string; mustChangePassword: boolean; phone: string | null },
  campus: { id: string; name: string; code: string | null; address?: string | null; phone?: string | null; email?: string | null; timezone?: string | null },
  branding: { logoUrl?: string } = {},
) {
  const role = schoolWorldRole(principal);
  return {
    id: principal.id,
    email: account.email || account.username,
    firstName: account.firstName,
    lastName: account.lastName,
    phone: account.phone,
    role,
    personType: role,
    mustChangePassword: account.mustChangePassword,
    // Platform admins can work in other campuses of the organisation (profile menu > Switch campus).
    canSwitchCampus: principal.roles.includes("PlatformAdmin"),
    school: {
      id: campus.id,
      name: campus.name,
      code: campus.code,
      address: campus.address ?? "",
      phone: campus.phone ?? "",
      email: campus.email ?? "",
      timezone: campus.timezone ?? "Asia/Kolkata",
      logoUrl: branding.logoUrl ?? "",
    },
  };
}

export function feeStatus(amount: number, paid: number) {
  if (paid <= 0) return "Pending";
  if (paid + 0.001 >= amount) return "Paid";
  return "Partial";
}

/**
 * Which students a signed-in account may see records of: staff see the whole campus, a student sees
 * only themselves, a parent only their linked children, anyone else nobody. Spread into a
 * Prisma `student` filter together with `campusId`.
 */
export function ownStudentsFilter(principal: AuthPrincipal): { id?: string | { in: string[] } } {
  if (principal.actorType === "STUDENT") return { id: principal.studentId || "__none__" };
  if (principal.actorType === "GUARDIAN") return { id: { in: principal.childIds ?? [] } };
  if (principal.actorType === "APPLICANT") return { id: "__none__" };
  return {};
}

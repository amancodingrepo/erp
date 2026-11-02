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
    school: {
      id: campus.id,
      name: campus.name,
      code: campus.code,
      address: campus.address ?? "",
      phone: campus.phone ?? "",
      email: campus.email ?? "",
      timezone: campus.timezone ?? "Asia/Kolkata",
    },
  };
}

export function feeStatus(amount: number, paid: number) {
  if (paid <= 0) return "Pending";
  if (paid + 0.001 >= amount) return "Paid";
  return "Partial";
}

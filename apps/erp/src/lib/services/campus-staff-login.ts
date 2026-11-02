import { validationError } from "@/lib/errors";

export function staffLoginUsername(input: {
  username?: string | null;
  phone?: string | null;
  employeeId: string;
}) {
  const username = String(input.username ?? "").trim();
  if (username) return username;
  const phone = String(input.phone ?? "").replace(/\s+/g, "");
  if (phone) return phone;
  return String(input.employeeId ?? "").trim();
}

export function staffCreateNeedsLogin(input: {
  username?: string | null;
  password?: string | null;
  roleId?: string | null;
}) {
  return Boolean(
    String(input.username ?? "").trim() ||
      String(input.password ?? "").trim() ||
      String(input.roleId ?? "").trim(),
  );
}

export function parseStaffCreatePassword(password?: string | null) {
  const value = String(password ?? "").trim();
  if (!value) return { set: false as const };
  if (value.length < 8) {
    throw validationError({ password: "min 8 characters" });
  }
  return { set: true as const, password: value };
}

export function toStaffLogin(user: {
  id: string;
  username: string;
  isActive: boolean;
  roles?: Array<{ role?: { id: string; name: string }; id?: string; name?: string }>;
} | null | undefined) {
  if (!user) return null;
  const roles = (user.roles ?? []).map((row) => {
    if (row.role) return { id: row.role.id, name: row.role.name };
    return { id: String(row.id ?? ""), name: String(row.name ?? "") };
  });
  return {
    id: user.id,
    username: user.username,
    isActive: user.isActive,
    roles,
  };
}

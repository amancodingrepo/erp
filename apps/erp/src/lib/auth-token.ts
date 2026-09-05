import { SignJWT, jwtVerify } from "jose";
import type { AuthPrincipal } from "./permissions";
import { requireAuthSecret } from "./secrets";

function secret() {
  return new TextEncoder().encode(requireAuthSecret());
}

export async function signAuthToken(principal: AuthPrincipal) {
  return new SignJWT({
    userId: principal.id,
    campusId: principal.campusId,
    actorType: principal.actorType,
    roles: principal.roles,
    permissions: principal.permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(principal.id)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifyAuthToken(
  token: string,
): Promise<AuthPrincipal | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.userId || !payload.campusId) return null;
    return {
      id: String(payload.userId),
      campusId: String(payload.campusId),
      actorType: String(payload.actorType ?? "STAFF"),
      roles: Array.isArray(payload.roles) ? payload.roles.map(String) : [],
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions.map(String)
        : [],
    };
  } catch {
    return null;
  }
}

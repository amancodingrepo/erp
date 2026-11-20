import { ActorType } from "@prisma/client";
import { GET as orgsGet } from "@/app/api/v1/orgs/route";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { login, req, SEED_PASSWORD } from "./acceptance/helpers";

export async function godToken() {
  const admin = await login("admin", "staff");
  if (admin.token) {
    const probe = await orgsGet(req("GET", "/api/v1/orgs", admin.token));
    if (probe.status === 200) return admin.token;
  }

  const main = await prisma.campus.findFirst({ where: { code: "MAIN" } });
  if (!main) throw new Error("MAIN campus missing");
  const role = await prisma.role.upsert({
    where: { campusId_name: { campusId: main.id, name: "PlatformAdmin" } },
    update: { isSystem: true },
    create: { campusId: main.id, name: "PlatformAdmin", isSystem: true },
  });
  const username = "platform-check";
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const user = await prisma.user.upsert({
    where: { campusId_username: { campusId: main.id, username } },
    update: { passwordHash, isActive: true, actorType: ActorType.STAFF },
    create: {
      campusId: main.id,
      actorType: ActorType.STAFF,
      username,
      email: "platform-check@main.local",
      passwordHash,
      isActive: true,
      firstName: "Platform",
      lastName: "Check",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
  const god = await login(username, "staff");
  if (!god.token) throw new Error("platform-check login failed");
  return god.token;
}

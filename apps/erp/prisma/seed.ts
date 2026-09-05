import { ActorType, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  PERMISSION_CATALOG,
  ROLE_GRANTS,
  SYSTEM_ROLES,
} from "../src/lib/permission-catalog";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  const passwordHash = await bcrypt.hash(password, 12);

  const org = await prisma.organization.upsert({
    where: { code: "INDORE-COLLEGE" },
    update: {},
    create: {
      name: "Indore College",
      code: "INDORE-COLLEGE",
    },
  });

  const campus = await prisma.campus.upsert({
    where: { id: "seed-campus-main" },
    update: { name: "Main Campus" },
    create: {
      id: "seed-campus-main",
      orgId: org.id,
      name: "Main Campus",
      code: "MAIN",
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
      currencyCode: "INR",
    },
  });

  const session = await prisma.academicSession.upsert({
    where: {
      campusId_name: { campusId: campus.id, name: "2025-26" },
    },
    update: { isCurrent: true, isActive: true },
    create: {
      campusId: campus.id,
      name: "2025-26",
      code: "2025-26",
      sequenceNo: 1,
      startDate: new Date("2025-06-01"),
      endDate: new Date("2026-05-31"),
      isCurrent: true,
      isActive: true,
    },
  });

  await prisma.campus.update({
    where: { id: campus.id },
    data: { currentSessionId: session.id },
  });

  for (const perm of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: {
        module_feature_action: {
          module: perm.module,
          feature: perm.feature,
          action: perm.action,
        },
      },
      update: {},
      create: perm,
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permByKey = new Map(
    allPermissions.map((p) => [`${p.module}.${p.feature}.${p.action}`, p]),
  );

  const roles = new Map<string, { id: string }>();
  for (const name of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { campusId_name: { campusId: campus.id, name } },
      update: { isSystem: true },
      create: {
        campusId: campus.id,
        name,
        isSystem: true,
      },
    });
    roles.set(name, role);
  }

  const superAdmin = roles.get("SuperAdmin")!;
  await prisma.rolePermission.deleteMany({ where: { roleId: superAdmin.id } });
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({
      roleId: superAdmin.id,
      permissionId: p.id,
    })),
  });

  for (const [roleName, grants] of Object.entries(ROLE_GRANTS)) {
    const role = roles.get(roleName);
    if (!role) continue;
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const rows = grants
      .map((key) => permByKey.get(key))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({ roleId: role.id, permissionId: p.id }));
    if (rows.length) {
      await prisma.rolePermission.createMany({ data: rows });
    }
  }

  const adminUser = await prisma.user.upsert({
    where: {
      campusId_username: { campusId: campus.id, username: "admin" },
    },
    update: { passwordHash, isActive: true, actorType: ActorType.STAFF },
    create: {
      campusId: campus.id,
      actorType: ActorType.STAFF,
      username: "admin",
      email: "admin@college.local",
      passwordHash,
      isActive: true,
    },
  });

  await prisma.staff.upsert({
    where: {
      campusId_employeeId: { campusId: campus.id, employeeId: "EMP-001" },
    },
    update: { userId: adminUser.id },
    create: {
      campusId: campus.id,
      userId: adminUser.id,
      employeeId: "EMP-001",
      firstName: "Campus",
      lastName: "Admin",
      email: "admin@college.local",
    },
  });

  await prisma.userRole.deleteMany({ where: { userId: adminUser.id } });
  await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: superAdmin.id },
  });

  console.log("Seed complete.");
  console.log("  campus:", campus.name);
  console.log("  session: 2025-26 (current)");
  console.log("  login: admin / (SEED_ADMIN_PASSWORD or Admin@12345)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

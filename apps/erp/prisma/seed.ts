import { ActorType, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { OPTIONAL_MODULES } from "../src/lib/catalog/nav-permissions";
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

  const teacherRole = roles.get("Teacher")!;
  const teacherUser = await prisma.user.upsert({
    where: {
      campusId_username: { campusId: campus.id, username: "teacher" },
    },
    update: { passwordHash, isActive: true, actorType: ActorType.STAFF },
    create: {
      campusId: campus.id,
      actorType: ActorType.STAFF,
      username: "teacher",
      email: "teacher@college.local",
      passwordHash,
      isActive: true,
    },
  });

  await prisma.staff.upsert({
    where: {
      campusId_employeeId: { campusId: campus.id, employeeId: "EMP-T01" },
    },
    update: { userId: teacherUser.id },
    create: {
      campusId: campus.id,
      userId: teacherUser.id,
      employeeId: "EMP-T01",
      firstName: "Demo",
      lastName: "Teacher",
      email: "teacher@college.local",
    },
  });

  await prisma.userRole.deleteMany({ where: { userId: teacherUser.id } });
  await prisma.userRole.create({
    data: { userId: teacherUser.id, roleId: teacherRole.id },
  });

  const defaultCategories = [
    { name: "General", code: "GEN" },
    { name: "OBC", code: "OBC" },
    { name: "SC", code: "SC" },
    { name: "ST", code: "ST" },
  ];
  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: { campusId: campus.id, name: cat.name },
    });
    if (!existing) {
      await prisma.category.create({
        data: { campusId: campus.id, name: cat.name, code: cat.code },
      });
    }
  }
  for (const name of ["Left college", "Disciplinary", "Transferred"]) {
    const existing = await prisma.disableReason.findFirst({
      where: { campusId: campus.id, name },
    });
    if (!existing) {
      await prisma.disableReason.create({
        data: { campusId: campus.id, name },
      });
    }
  }

  await prisma.setting.upsert({
    where: { campusId_key: { campusId: campus.id, key: "attendance.lockDays" } },
    update: {},
    create: { campusId: campus.id, key: "attendance.lockDays", value: 7 },
  });

  for (const id of OPTIONAL_MODULES) {
    const key = `module.${id}.enabled`;
    const enabled = id === "admission" || id === "hostel" || id === "transport";
    await prisma.setting.upsert({
      where: { campusId_key: { campusId: campus.id, key } },
      update: { value: enabled },
      create: { campusId: campus.id, key, value: enabled },
    });
  }
  await prisma.setting.upsert({
    where: {
      campusId_key: { campusId: campus.id, key: "admission.applicationFee" },
    },
    update: {},
    create: {
      campusId: campus.id,
      key: "admission.applicationFee",
      value: 500,
    },
  });
  await prisma.messageTemplate.upsert({
    where: {
      campusId_channel_name: {
        campusId: campus.id,
        channel: "SMS",
        name: "fee_due",
      },
    },
    update: {},
    create: {
      campusId: campus.id,
      channel: "SMS",
      name: "fee_due",
      body: "Dear {{name}}, fee due {{balance}} at {{campus}}. ID {{admissionNo}}.",
    },
  });
  await prisma.messageTemplate.upsert({
    where: {
      campusId_channel_name: {
        campusId: campus.id,
        channel: "EMAIL",
        name: "fee_due",
      },
    },
    update: {},
    create: {
      campusId: campus.id,
      channel: "EMAIL",
      name: "fee_due",
      subject: "Fee reminder — {{campus}}",
      body: "Dear {{name}}, your outstanding balance is {{balance}}.",
    },
  });

  const demoDept = await prisma.department.upsert({
    where: { id: "seed-dept-demo" },
    update: { name: "General" },
    create: {
      id: "seed-dept-demo",
      campusId: campus.id,
      name: "Demo Arts",
      code: "DEMO",
    },
  });
  const demoProgram = await prisma.program.upsert({
    where: { id: "seed-program-demo" },
    update: { name: "BA" },
    create: {
      id: "seed-program-demo",
      departmentId: demoDept.id,
      name: "BA",
      level: "UNDERGRADUATE",
    },
  });
  const demoClass = await prisma.class.upsert({
    where: { id: "seed-class-fy" },
    update: { name: "FY BA" },
    create: {
      id: "seed-class-fy",
      programId: demoProgram.id,
      name: "FY BA",
      yearNo: 1,
    },
  });
  const demoSection = await prisma.section.upsert({
    where: { id: "seed-section-a" },
    update: { name: "A" },
    create: {
      id: "seed-section-a",
      classId: demoClass.id,
      name: "A",
    },
  });

  const studentRole = roles.get("Student")!;
  const parentRole = roles.get("Parent")!;

  const studentUser = await prisma.user.upsert({
    where: { campusId_username: { campusId: campus.id, username: "student1" } },
    update: { passwordHash, isActive: true, actorType: ActorType.STUDENT },
    create: {
      campusId: campus.id,
      actorType: ActorType.STUDENT,
      username: "student1",
      email: "student1@college.local",
      passwordHash,
      isActive: true,
    },
  });
  const demoStudent = await prisma.student.upsert({
    where: {
      campusId_admissionNo: { campusId: campus.id, admissionNo: "STU-001" },
    },
    update: { userId: studentUser.id, firstName: "Demo", lastName: "Student" },
    create: {
      campusId: campus.id,
      userId: studentUser.id,
      admissionNo: "STU-001",
      firstName: "Demo",
      lastName: "Student",
    },
  });
  await prisma.studentEnrollment.upsert({
    where: { id: "seed-enroll-stu001" },
    update: {
      classId: demoClass.id,
      sectionId: demoSection.id,
      sessionId: session.id,
      isCurrent: true,
    },
    create: {
      id: "seed-enroll-stu001",
      studentId: demoStudent.id,
      sessionId: session.id,
      classId: demoClass.id,
      sectionId: demoSection.id,
      isCurrent: true,
    },
  });
  await prisma.userRole.deleteMany({ where: { userId: studentUser.id } });
  await prisma.userRole.create({
    data: { userId: studentUser.id, roleId: studentRole.id },
  });

  const parentUser = await prisma.user.upsert({
    where: { campusId_username: { campusId: campus.id, username: "parent1" } },
    update: { passwordHash, isActive: true, actorType: ActorType.GUARDIAN },
    create: {
      campusId: campus.id,
      actorType: ActorType.GUARDIAN,
      username: "parent1",
      email: "parent1@college.local",
      passwordHash,
      isActive: true,
    },
  });
  const guardian = await prisma.guardian.upsert({
    where: { userId: parentUser.id },
    update: { name: "Demo Parent" },
    create: {
      userId: parentUser.id,
      name: "Demo Parent",
      phone: "9000000000",
    },
  });
  await prisma.studentGuardian.upsert({
    where: {
      studentId_guardianId_relation: {
        studentId: demoStudent.id,
        guardianId: guardian.id,
        relation: "father",
      },
    },
    update: {},
    create: {
      studentId: demoStudent.id,
      guardianId: guardian.id,
      relation: "father",
    },
  });
  await prisma.userRole.deleteMany({ where: { userId: parentUser.id } });
  await prisma.userRole.create({
    data: { userId: parentUser.id, roleId: parentRole.id },
  });

  console.log("Seed complete.");
  console.log("  campus:", campus.name);
  console.log("  session: 2025-26 (current)");
  console.log("  login: admin / (SEED_ADMIN_PASSWORD or Admin@12345)");
  console.log("  login: teacher / (same password, Teacher grants only)");
  console.log("  login: student1 / parent1 (same password, student & parent portals)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { randomBytes } from "node:crypto";
import { ActorType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export type PortalLogin = {
  username: string;
  password: string;
  portal: "student" | "parent";
};

function slugUsername(raw: string) {
  const s = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return s.length >= 3 ? s.slice(0, 32) : `stu${s}`.slice(0, 32);
}

function tempPassword() {
  return `Portal@${randomBytes(4).toString("hex")}`;
}

async function uniqueUsername(campusId: string, base: string) {
  const root = slugUsername(base);
  for (let i = 0; i < 30; i++) {
    const username = i === 0 ? root : `${root}${i}`.slice(0, 40);
    const exists = await prisma.user.findFirst({
      where: { campusId, username },
    });
    if (!exists) return username;
  }
  return `${root}${Date.now().toString(36)}`.slice(0, 40);
}

async function assignRole(campusId: string, userId: string, name: string) {
  const role = await prisma.role.findFirst({
    where: { campusId, name },
  });
  if (!role) return;
  await prisma.userRole.create({
    data: { userId, roleId: role.id },
  });
}

export async function provisionEnrollmentPortals(input: {
  campusId: string;
  studentId: string;
  admissionNo: string;
  studentEmail?: string | null;
  fatherName?: string | null;
  fatherPhone?: string | null;
}) {
  const studentPassword = tempPassword();
  const studentUsername = await uniqueUsername(input.campusId, input.admissionNo);
  const studentUser = await prisma.user.create({
    data: {
      campusId: input.campusId,
      actorType: ActorType.STUDENT,
      username: studentUsername,
      email: input.studentEmail,
      passwordHash: await hashPassword(studentPassword),
      isActive: true,
    },
  });
  await prisma.student.update({
    where: { id: input.studentId },
    data: { userId: studentUser.id },
  });
  await assignRole(input.campusId, studentUser.id, "Student");

  const studentLogin: PortalLogin = {
    username: studentUsername,
    password: studentPassword,
    portal: "student",
  };

  let parentLogin: PortalLogin | null = null;
  const guardian = await prisma.studentGuardian.findFirst({
    where: { studentId: input.studentId, relation: "father" },
    include: { guardian: true },
  });
  const guardianRow = guardian?.guardian;
  if (guardianRow && !guardianRow.userId && (input.fatherName || guardianRow.name)) {
    const parentPassword = tempPassword();
    const parentUsername = await uniqueUsername(
      input.campusId,
      `p${input.admissionNo}`,
    );
    const parentUser = await prisma.user.create({
      data: {
        campusId: input.campusId,
        actorType: ActorType.GUARDIAN,
        username: parentUsername,
        email: guardianRow.email,
        passwordHash: await hashPassword(parentPassword),
        isActive: true,
      },
    });
    await prisma.guardian.update({
      where: { id: guardianRow.id },
      data: {
        userId: parentUser.id,
        phone: guardianRow.phone ?? input.fatherPhone,
      },
    });
    await assignRole(input.campusId, parentUser.id, "Parent");
    parentLogin = {
      username: parentUsername,
      password: parentPassword,
      portal: "parent",
    };
  }

  const campus = await prisma.campus.findUnique({
    where: { id: input.campusId },
    select: { code: true, name: true },
  });

  return {
    campusCode: campus?.code ?? "MAIN",
    campusName: campus?.name ?? "Campus",
    student: studentLogin,
    parent: parentLogin,
  };
}

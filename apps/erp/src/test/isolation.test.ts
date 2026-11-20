import { unlink } from "node:fs/promises";
import { ActorType, ExamKind } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { GET as attendanceGet } from "@/app/api/attendance/route";
import { GET as receiptGet } from "@/app/api/fees/[feeId]/receipt-data/route";
import { POST as switchPost } from "@/app/api/v1/auth/switch-campus/route";
import { POST as examPost } from "@/app/api/v1/exam-groups/[id]/exams/route";
import { POST as orgsPost } from "@/app/api/v1/orgs/route";
import { GET as reportGet } from "@/app/api/v1/reports/[key]/route";
import { GET as studentGet } from "@/app/api/v1/students/[id]/route";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { loadSmtpConfig } from "@/lib/smtp";
import { clearTenant } from "@/lib/tenant-context";
import { writeCampusBytes } from "@/lib/uploads";
import { json, login, req, SEED_PASSWORD } from "./acceptance/helpers";

async function platformToken() {
  const existing = await login("platform-check", "staff", SEED_PASSWORD, "MAIN");
  if (existing.token) return existing.token;
  const main = await prisma.campus.findFirst({ where: { code: "MAIN" } });
  if (!main) throw new Error("MAIN campus missing");
  const role = await prisma.role.upsert({
    where: { campusId_name: { campusId: main.id, name: "PlatformAdmin" } },
    update: { isSystem: true },
    create: { campusId: main.id, name: "PlatformAdmin", isSystem: true },
  });
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const user = await prisma.user.upsert({
    where: { campusId_username: { campusId: main.id, username: "platform-check" } },
    update: { passwordHash, isActive: true, actorType: ActorType.STAFF },
    create: {
      campusId: main.id,
      actorType: ActorType.STAFF,
      username: "platform-check",
      email: "platform-check@main.local",
      passwordHash,
      isActive: true,
      firstName: "Platform",
      lastName: "Check",
    },
  });
  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  const god = await login("platform-check", "staff", SEED_PASSWORD, "MAIN");
  if (!god.token) throw new Error("platform-check login failed");
  return god.token;
}

describe("campus isolation", () => {
  it("keeps school A from reading school B by id", async () => {
    clearTenant();
    const stamp = Date.now().toString(36).slice(-6).toUpperCase();
    const god = await platformToken();
    const madeA = await json(await orgsPost(req("POST", "/api/v1/orgs", god, {
      name: `Isolation A ${stamp}`,
      code: `IA${stamp}`,
    })));
    const madeB = await json(await orgsPost(req("POST", "/api/v1/orgs", god, {
      name: `Isolation B ${stamp}`,
      code: `IB${stamp}`,
    })));
    expect(madeA.status).toBe(201);
    expect(madeB.status).toBe(201);

    const orgA = madeA.body as {
      id: string;
      campus: { id: string; currentSessionId: string };
      principalPassword: string;
    };
    const orgB = madeB.body as typeof orgA;
    const admA = `R5A-${stamp}`;
    const admB = `R5B-${stamp}`;

    const studentA = await prisma.student.create({
      data: { campusId: orgA.campus.id, admissionNo: admA, firstName: "Asha" },
    });
    const studentB = await prisma.student.create({
      data: { campusId: orgB.campus.id, admissionNo: admB, firstName: "Bina" },
    });
    const feeTypeA = await prisma.feeType.create({
      data: { campusId: orgA.campus.id, name: `Fee ${stamp} A` },
    });
    const feeTypeB = await prisma.feeType.create({
      data: { campusId: orgB.campus.id, name: `Fee ${stamp} B` },
    });
    const invoiceA = await prisma.feeInvoice.create({
      data: {
        studentId: studentA.id,
        sessionId: orgA.campus.currentSessionId,
        total: 100,
        paid: 100,
        status: "PAID",
        lines: {
          create: {
            feeTypeId: feeTypeA.id,
            description: "Tuition",
            amount: 100,
            paid: 100,
          },
        },
      },
      include: { lines: true },
    });
    const invoiceB = await prisma.feeInvoice.create({
      data: {
        studentId: studentB.id,
        sessionId: orgB.campus.currentSessionId,
        total: 100,
        paid: 100,
        status: "PAID",
        lines: {
          create: {
            feeTypeId: feeTypeB.id,
            description: "Tuition",
            amount: 100,
            paid: 100,
          },
        },
      },
      include: { lines: true },
    });
    const markA = await prisma.studentAttendance.create({
      data: { studentId: studentA.id, date: new Date("2026-11-12"), status: "PRESENT" },
    });
    const markB = await prisma.studentAttendance.create({
      data: { studentId: studentB.id, date: new Date("2026-11-12"), status: "ABSENT" },
    });
    const groupA = await prisma.feeGroup.create({
      data: { campusId: orgA.campus.id, name: `Group ${stamp} A` },
    });
    const groupB = await prisma.feeGroup.create({
      data: { campusId: orgB.campus.id, name: `Group ${stamp} B` },
    });
    const examB = await prisma.examGroup.create({
      data: {
        campusId: orgB.campus.id,
        sessionId: orgB.campus.currentSessionId,
        name: `Exam ${stamp}`,
        examType: ExamKind.SCHOOL_GRADE,
      },
    });
    await prisma.setting.upsert({
      where: { campusId_key: { campusId: orgB.campus.id, key: "smtp.host" } },
      update: { value: "smtp.school-b.example" },
      create: {
        campusId: orgB.campus.id,
        key: "smtp.host",
        value: "smtp.school-b.example",
      },
    });
    const teacherRole = await prisma.role.findFirst({
      where: { campusId: orgA.campus.id, name: "Teacher" },
    });
    if (!teacherRole) throw new Error("Teacher role missing");
    await prisma.user.create({
      data: {
        campusId: orgA.campus.id,
        actorType: ActorType.STAFF,
        username: "r5-teacher",
        email: `r5-teacher-${stamp}@ia.local`,
        passwordHash: await hashPassword(SEED_PASSWORD),
        isActive: true,
        firstName: "Ria",
        lastName: "Teacher",
        roles: { create: { roleId: teacherRole.id } },
      },
    });

    const principalA = await login("principal", "staff", orgA.principalPassword, `IA${stamp}`);
    const teacher = await login("r5-teacher", "staff", SEED_PASSWORD, `IA${stamp}`);
    expect(principalA.token).toBeTruthy();
    expect(teacher.token).toBeTruthy();
    const tokenA = principalA.token!;

    const foreignStudent = await studentGet(
      req("GET", `/api/v1/students/${studentB.id}`, tokenA),
      { params: Promise.resolve({ id: studentB.id }) },
    );
    expect(foreignStudent.status).toBe(404);
    const ownStudent = await studentGet(
      req("GET", `/api/v1/students/${studentA.id}`, tokenA),
      { params: Promise.resolve({ id: studentA.id }) },
    );
    expect(ownStudent.status).toBe(200);

    const foreignFee = await receiptGet(
      req("GET", `/api/fees/${invoiceB.lines[0].id}/receipt-data`, tokenA),
      { params: Promise.resolve({ feeId: invoiceB.lines[0].id }) },
    );
    expect(foreignFee.status).toBe(404);
    const ownFee = await receiptGet(
      req("GET", `/api/fees/${invoiceA.lines[0].id}/receipt-data`, tokenA),
      { params: Promise.resolve({ feeId: invoiceA.lines[0].id }) },
    );
    expect(ownFee.status).toBe(200);

    const foreignMark = await attendanceGet(
      req("GET", `/api/attendance?id=${markB.id}`, tokenA),
    );
    expect(foreignMark.status).toBe(404);
    const ownMark = await json(await attendanceGet(
      req("GET", `/api/attendance?id=${markA.id}`, tokenA),
    ));
    expect(ownMark.status).toBe(200);
    expect((ownMark.body.record as { id: string }).id).toBe(markA.id);

    const otherOrg = await studentGet(
      req("GET", `/api/v1/students/${studentA.id}`, tokenA, undefined, { "x-org-id": orgB.id }),
      { params: Promise.resolve({ id: studentA.id }) },
    );
    expect(otherOrg.status).toBe(403);

    const leakedExam = await examPost(
      req("POST", `/api/v1/exam-groups/${examB.id}/exams`, tokenA, { name: "Leak" }),
      { params: Promise.resolve({ id: examB.id }) },
    );
    expect(leakedExam.status).toBe(404);

    const teacherDues = await reportGet(
      req("GET", "/api/v1/reports/dues", teacher.token!),
      { params: Promise.resolve({ key: "dues" }) },
    );
    expect(teacherDues.status).toBe(403);
    const foreignGroup = await reportGet(
      req("GET", `/api/v1/reports/dues?feeGroupId=${groupB.id}`, tokenA),
      { params: Promise.resolve({ key: "dues" }) },
    );
    expect(foreignGroup.status).toBe(404);
    const students = await json(await reportGet(
      req("GET", "/api/v1/reports/students", tokenA),
      { params: Promise.resolve({ key: "students" }) },
    ));
    expect(students.status).toBe(200);
    const admissionNos = (students.body.rows as Array<{ admissionNo: string }>).map((row) => row.admissionNo);
    expect(admissionNos).toContain(admA);
    expect(admissionNos).not.toContain(admB);
    void groupA;

    const savedHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;
    try {
      expect(await loadSmtpConfig(orgA.campus.id)).toBeNull();
      expect((await loadSmtpConfig(orgB.campus.id))?.host).toBe("smtp.school-b.example");
    } finally {
      if (savedHost === undefined) delete process.env.SMTP_HOST;
      else process.env.SMTP_HOST = savedHost;
    }

    const written = await writeCampusBytes({
      campusId: orgA.campus.id,
      kind: "student",
      ownerId: studentA.id,
      filename: "note.png",
      mime: "image/png",
      bytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    });
    expect(written.relPath.startsWith(`${orgA.id}/`)).toBe(true);
    await unlink(written.abs);

    const switched = await json(await switchPost(
      req("POST", "/api/v1/auth/switch-campus", god, { campusId: orgB.campus.id }),
    ));
    expect(switched.status).toBe(200);
    const asB = await studentGet(
      req("GET", `/api/v1/students/${studentB.id}`, String(switched.body.token)),
      { params: Promise.resolve({ id: studentB.id }) },
    );
    expect(asB.status).toBe(200);

    clearTenant();
    const roles = await prisma.$queryRaw<Array<{ ok: boolean }>>`
      SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_tenant') AS ok
    `;
    if (roles[0]?.ok) {
      const hidden = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL ROLE erp_tenant");
        await tx.$executeRaw`SELECT set_config('app.org_id', ${orgA.id}, true)`;
        return tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Student" WHERE id = ${studentB.id}
        `;
      });
      expect(hidden).toEqual([]);
      const shown = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL ROLE erp_tenant");
        await tx.$executeRaw`SELECT set_config('app.org_id', ${orgA.id}, true)`;
        return tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Student" WHERE id = ${studentA.id}
        `;
      });
      expect(shown.map((row) => row.id)).toEqual([studentA.id]);
    }
  }, 120000);
});

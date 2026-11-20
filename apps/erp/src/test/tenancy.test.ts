import { ActorType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { GET as attendanceGet } from "@/app/api/attendance/route";
import { GET as feesGet } from "@/app/api/fees/route";
import { GET as receiptGet } from "@/app/api/fees/[feeId]/receipt-data/route";
import { GET as campusesGet } from "@/app/api/v1/public/campuses/route";
import { GET as applyGet } from "@/app/api/v1/public/apply/route";
import { POST as applyPost } from "@/app/api/v1/public/applications/route";
import { POST as switchPost } from "@/app/api/v1/auth/switch-campus/route";
import { GET as orgsGet, POST as orgsPost } from "@/app/api/v1/orgs/route";
import { PATCH as orgPatch } from "@/app/api/v1/orgs/[id]/route";
import { GET as studentsGet } from "@/app/api/v1/students/route";
import { GET as studentGet } from "@/app/api/v1/students/[id]/route";
import { GET as tenantsGet } from "@/app/api/v1/tenants/route";
import { POST as tenantsPost } from "@/app/api/v1/tenants/route";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { exportOrg, restoreOrg } from "@/lib/org-backup";
import { clearTenant } from "@/lib/tenant-context";
import { login, req, json, SEED_PASSWORD } from "./acceptance/helpers";

describe("multi-tenant campuses", () => {
  it("lists public campus codes", async () => {
    const res = await campusesGet();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ code: string; name: string }>;
    };
    const codes = body.data.map((c) => c.code);
    expect(codes).toContain("MAIN");
    expect(codes).toContain("EAST");
  });

  it("scopes login to campus so MAIN admin does not see EAST students", async () => {
    const main = await login("admin", "staff");
    const east = await login("admin", "staff", SEED_PASSWORD, "EAST");
    expect(main.token).toBeTruthy();
    expect(east.token).toBeTruthy();

    const eastCampus = await prisma.campus.findFirst({ where: { code: "EAST" } });
    if (!eastCampus) throw new Error("EAST campus missing from seed");
    expect(
      (east.body as { user?: { campusId: string } }).user?.campusId,
    ).toBe(eastCampus.id);

    const mainStudents = await json(
      await studentsGet(req("GET", "/api/v1/students?pageSize=100", main.token!)),
    );
    const eastStudents = await json(
      await studentsGet(req("GET", "/api/v1/students?pageSize=100", east.token!)),
    );
    expect(mainStudents.status).toBe(200);
    expect(eastStudents.status).toBe(200);
    const mainIds = new Set(
      ((mainStudents.body.data as Array<{ id: string }>) ?? []).map((s) => s.id),
    );
    const eastIds = (
      (eastStudents.body.data as Array<{ id: string }>) ?? []
    ).map((s) => s.id);
    expect(eastIds.some((id) => mainIds.has(id))).toBe(false);
  });

  it("public apply can target EAST", async () => {
    const catalog = await applyGet(
      new Request("http://local/api/v1/public/apply?campus=EAST"),
    );
    expect(catalog.status).toBe(200);
    const cat = (await catalog.json()) as { campus: { code?: string } };
    expect(cat.campus.code).toBe("EAST");

    const eastProgram = await prisma.program.findFirst({
      where: { department: { campus: { code: "EAST" } } },
    });
    const created = await applyPost(
      new Request("http://local/api/v1/public/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: "East",
          lastName: "Applicant",
          fatherName: "East Parent",
          mobile: "9000000011",
          email: "east.applicant@example.com",
          dob: "2011-04-01",
          gender: "MALE",
          programId: eastProgram?.id,
          previousQualification: "Class 8",
          score: 72,
          campusCode: "EAST",
        }),
      }),
    );
    expect(created.status).toBe(201);
    const body = (await created.json()) as { id: string };
    const row = await prisma.application.findUnique({ where: { id: body.id } });
    const east = await prisma.campus.findFirst({ where: { code: "EAST" } });
    expect(row?.campusId).toBe(east?.id);
  });

  it("teacher cannot list tenants; PlatformAdmin can switch campus", async () => {
    const teacher = await login("teacher", "staff");
    const denied = await tenantsGet(
      req("GET", "/api/v1/tenants", teacher.token!),
    );
    expect(denied.status).toBe(403);

    const admin = await login("admin", "staff");
    const list = await json(
      await tenantsGet(req("GET", "/api/v1/tenants", admin.token!)),
    );
    expect(list.status).toBe(200);
    const rows = list.body.data as Array<{ id: string; code: string }>;
    const east = rows.find((r) => r.code === "EAST");
    expect(east).toBeTruthy();

    const switched = await json(
      await switchPost(
        req("POST", "/api/v1/auth/switch-campus", admin.token!, {
          campusCode: "EAST",
        }),
      ),
    );
    expect(switched.status).toBe(200);
    expect((switched.body.campus as { code: string }).code).toBe("EAST");
  });

  it("PlatformAdmin can create a campus", async () => {
    const admin = await login("admin", "staff");
    const code = `T${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const created = await json(
      await tenantsPost(
        req("POST", "/api/v1/tenants", admin.token!, {
          name: `Test ${code}`,
          code,
        }),
      ),
    );
    expect(created.status).toBe(201);
    expect(created.body.code).toBe(code);
    expect(created.body.adminPassword).toBeTruthy();
  });
});

describe("runs 01-05 on one database", () => {
  it("keeps the god, the new organisation, module ceiling, and row isolation", async () => {
    clearTenant();
    const main = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!main) throw new Error("MAIN campus missing");
    const godLogin = await login("platform-check", "staff", SEED_PASSWORD, "MAIN");
    if (!godLogin.token) throw new Error("platform-check login failed");
    const god = godLogin.token;
    const stamp = Date.now().toString(36).slice(-6).toUpperCase();

    const madeA = await json(await orgsPost(req("POST", "/api/v1/orgs", god, {
      name: `Run A ${stamp}`,
      code: `RA${stamp}`,
    })));
    const madeB = await json(await orgsPost(req("POST", "/api/v1/orgs", god, {
      name: `Run B ${stamp}`,
      code: `RB${stamp}`,
    })));
    expect(madeA.status).toBe(201);
    expect(madeB.status).toBe(201);
    const orgA = madeA.body as {
      id: string;
      campus: { id: string; currentSessionId: string };
      principalPassword: string;
    };
    const orgB = madeB.body as typeof orgA;
    const studentA = await prisma.student.create({
      data: { campusId: orgA.campus.id, admissionNo: `RA-${stamp}`, firstName: "Asha" },
    });
    const studentB = await prisma.student.create({
      data: { campusId: orgB.campus.id, admissionNo: `RB-${stamp}`, firstName: "Bina" },
    });
    const feeType = await prisma.feeType.create({
      data: { campusId: orgB.campus.id, name: `Fee ${stamp}` },
    });
    const invoice = await prisma.feeInvoice.create({
      data: {
        studentId: studentB.id,
        sessionId: orgB.campus.currentSessionId,
        total: 100,
        paid: 100,
        status: "PAID",
        lines: { create: { feeTypeId: feeType.id, description: "Tuition", amount: 100, paid: 100 } },
      },
      include: { lines: true },
    });
    const mark = await prisma.studentAttendance.create({
      data: { studentId: studentB.id, date: new Date("2026-11-12"), status: "PRESENT" },
    });

    const listed = await json(await orgsGet(req("GET", "/api/v1/orgs", god)));
    expect(listed.status).toBe(200);
    const listedCodes = (listed.body.data as Array<{ campuses: Array<{ code: string | null }> }>).flatMap((org) => org.campuses.map((campus) => campus.code));
    expect(listedCodes).toContain("MAIN");
    expect(listedCodes).toContain(`RA${stamp}`);

    const principal = await login("principal", "staff", orgA.principalPassword, `RA${stamp}`);
    expect(principal.token).toBeTruthy();
    const principalUser = await prisma.user.findFirst({
      where: { campusId: orgA.campus.id, username: "principal" },
      include: { roles: { include: { role: true } } },
    });
    expect(principalUser?.roles.some((row) => row.role.name === "PlatformAdmin")).toBe(false);
    expect((await orgsGet(req("GET", "/api/v1/orgs", principal.token!))).status).toBe(403);

    const klass = await prisma.class.findFirst({
      where: { program: { department: { campusId: orgA.campus.id } } },
      include: { sections: true },
    });
    if (!klass?.sections[0]) throw new Error("class missing");
    await prisma.studentEnrollment.create({
      data: {
        studentId: studentA.id,
        sessionId: orgA.campus.currentSessionId,
        classId: klass.id,
        sectionId: klass.sections[0].id,
        isCurrent: true,
      },
    });

    const switched = await json(await switchPost(req("POST", "/api/v1/auth/switch-campus", god, {
      campusId: orgA.campus.id,
    })));
    expect(switched.status).toBe(200);
    const opened = await json(await studentsGet(req("GET", "/api/v1/students?pageSize=100", String(switched.body.token))));
    expect(opened.status).toBe(200);
    const openedIds = ((opened.body.data as Array<{ id: string }>) ?? []).map((row) => row.id);
    expect(openedIds).toContain(studentA.id);
    expect(openedIds).not.toContain(studentB.id);

    const tokenA = principal.token!;
    expect((await studentGet(
      req("GET", `/api/v1/students/${studentB.id}`, tokenA),
      { params: Promise.resolve({ id: studentB.id }) },
    )).status).toBe(404);
    expect((await receiptGet(
      req("GET", `/api/fees/${invoice.lines[0].id}/receipt-data`, tokenA),
      { params: Promise.resolve({ feeId: invoice.lines[0].id }) },
    )).status).toBe(404);
    expect((await attendanceGet(req("GET", `/api/attendance?id=${mark.id}`, tokenA))).status).toBe(404);

    const feesOff = await orgPatch(
      req("PATCH", `/api/v1/orgs/${orgA.id}`, god, { modules: { fees: false } }),
      { params: Promise.resolve({ id: orgA.id }) },
    );
    expect(feesOff.status).toBe(200);
    const teacherRole = await prisma.role.findFirst({ where: { campusId: orgA.campus.id, name: "Teacher" } });
    if (!teacherRole) throw new Error("Teacher role missing");
    await prisma.user.create({
      data: {
        campusId: orgA.campus.id,
        actorType: ActorType.STAFF,
        username: "r6-teacher",
        email: `r6-teacher-${stamp}@ra.local`,
        passwordHash: await hashPassword(SEED_PASSWORD),
        isActive: true,
        firstName: "Ria",
        lastName: "Teacher",
        roles: { create: { roleId: teacherRole.id } },
      },
    });
    const teacher = await login("r6-teacher", "staff", SEED_PASSWORD, `RA${stamp}`);
    expect((await feesGet(req("GET", "/api/fees", teacher.token!))).status).toBe(403);
    const godOnA = await json(await switchPost(req("POST", "/api/v1/auth/switch-campus", god, {
      campusId: orgA.campus.id,
    })));
    expect((await feesGet(req("GET", "/api/fees", String(godOnA.body.token)))).status).toBe(200);

    clearTenant();
    const fixture = await exportOrg(orgA.id);
    const extra = await prisma.student.create({
      data: { campusId: orgA.campus.id, admissionNo: `RX-${stamp}`, firstName: "Extra" },
    });
    clearTenant();
    await restoreOrg(fixture);
    expect(await prisma.student.findUnique({ where: { id: extra.id } })).toBeNull();
    expect(await prisma.student.findUnique({ where: { id: studentB.id } })).toBeTruthy();
    clearTenant();
  }, 120000);
});

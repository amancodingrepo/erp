import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as classesPost } from "@/app/api/v1/classes/route";
import { POST as departmentsPost } from "@/app/api/v1/departments/route";
import { POST as programsPost } from "@/app/api/v1/programs/route";
import { POST as studentsPost } from "@/app/api/v1/students/route";
import { PUT as workingDaysPut } from "@/app/api/v1/working-days/route";
import {
  GET as attendanceGet,
  PUT as attendancePut,
} from "@/app/api/v1/attendance/students/route";
import { GET as reportGet } from "@/app/api/v1/attendance/students/report/route";
import { PUT as staffAttendancePut } from "@/app/api/v1/attendance/staff/route";
import { POST as leaveTypesPost } from "@/app/api/v1/leave-types/route";
import { POST as leavePost } from "@/app/api/v1/leave-requests/route";
import { POST as approvePost } from "@/app/api/v1/leave-requests/[id]/approve/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `t5-${Date.now()}`;

function req(method: string, path: string, token: string, payload?: unknown) {
  return new Request(`http://local${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(payload !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
}

async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("Task 5 attendance and leave", () => {
  let admin: string;
  let teacher: string;
  let campusId: string;
  let sessionId: string;
  let sectionId: string;
  let studentId: string;
  let staffId: string;
  const workDate = "2026-08-10";
  const holiday = "2026-08-15";

  beforeAll(async () => {
    async function login(username: string) {
      const res = await loginPost(
        new Request("http://local/api/v1/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username, password: SEED_PASSWORD, portal: "staff" }),
        }),
      );
      const body = (await res.json()) as { token?: string };
      if (!body.token) throw new Error(`login failed ${username}: ${res.status}`);
      return body.token;
    }
    admin = await login("admin");
    teacher = await login("teacher");
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    campusId = campus.id;
    sessionId = campus.currentSessionId;
    const staff = await prisma.staff.findFirst({
      where: { campusId, employeeId: "EMP-T01" },
    });
    staffId = staff?.id ?? "";

    const dept = await json(
      await departmentsPost(
        req("POST", "/api/v1/departments", admin, {
          name: `Att ${suffix}`,
          code: `ATT-${suffix}`,
        }),
      ),
    );
    const program = await json(
      await programsPost(
        req("POST", "/api/v1/programs", admin, {
          departmentId: (dept.body as { id: string }).id,
          name: `BA ${suffix}`,
          level: "UNDERGRADUATE",
        }),
      ),
    );
    const klass = await json(
      await classesPost(
        req("POST", "/api/v1/classes", admin, {
          programId: (program.body as { id: string }).id,
          name: `FY ${suffix}`,
          yearNo: 1,
          sectionNames: ["A"],
        }),
      ),
    );
    sectionId = (klass.body as { sections: { id: string }[] }).sections[0].id;
    const student = await json(
      await studentsPost(
        req("POST", "/api/v1/students", admin, {
          admissionNo: `AT-${suffix}`,
          firstName: "Ira",
          classId: (klass.body as { id: string }).id,
          sectionId,
          sessionId,
        }),
      ),
    );
    studentId = (student.body as { id: string }).id;

    await workingDaysPut(
      req("PUT", "/api/v1/working-days", admin, {
        date: workDate,
        isWorking: true,
        sessionId,
      }),
    );
    await workingDaysPut(
      req("PUT", "/api/v1/working-days", admin, {
        date: holiday,
        isWorking: false,
        note: "Independence Day",
        sessionId,
      }),
    );
    await prisma.setting.upsert({
      where: { campusId_key: { campusId, key: "attendance.lockDays" } },
      update: { value: 7 },
      create: { campusId, key: "attendance.lockDays", value: 7 },
    });
  });

  it("marks a working day and rejects a holiday unless override", async () => {
    const okMark = await json(
      await attendancePut(
        req("PUT", "/api/v1/attendance/students", admin, {
          date: workDate,
          sectionId,
          entries: [{ studentId, status: "PRESENT" }],
        }),
      ),
    );
    expect(okMark.status).toBe(200);

    const blocked = await json(
      await attendancePut(
        req("PUT", "/api/v1/attendance/students", admin, {
          date: holiday,
          sectionId,
          entries: [{ studentId, status: "ABSENT" }],
        }),
      ),
    );
    expect(blocked.status).toBe(422);
    expect((blocked.body.fields as { date?: string }).date).toBe("holiday");

    const forced = await json(
      await attendancePut(
        req("PUT", "/api/v1/attendance/students", admin, {
          date: holiday,
          sectionId,
          override: true,
          entries: [{ studentId, status: "HOLIDAY" }],
        }),
      ),
    );
    expect(forced.status).toBe(200);
  });

  it("monthly percent ignores HOLIDAY rows", async () => {
    const report = await json(
      await reportGet(
        req(
          "GET",
          `/api/v1/attendance/students/report?sectionId=${sectionId}&from=2026-08-01&to=2026-08-31`,
          admin,
        ),
      ),
    );
    expect(report.status).toBe(200);
    const row = (
      report.body as { data: Array<{ studentId: string; present: number; total: number; percent: number }> }
    ).data.find((r) => r.studentId === studentId);
    expect(row?.present).toBe(1);
    expect(row?.total).toBe(1);
    expect(row?.percent).toBe(100);
  });

  it("approved student leave codes LEAVE not ABSENT", async () => {
    const type = await json(
      await leaveTypesPost(
        req("POST", "/api/v1/leave-types", admin, { name: `CL ${suffix}`, daysYear: 12 }),
      ),
    );
    expect(type.status).toBe(201);
    const applied = await json(
      await leavePost(
        req("POST", "/api/v1/leave-requests", admin, {
          leaveTypeId: (type.body as { id: string }).id,
          studentId,
          fromDate: "2026-08-11",
          toDate: "2026-08-12",
          reason: "family",
        }),
      ),
    );
    expect(applied.status).toBe(201);
    const approved = await json(
      await approvePost(
        req(
          "POST",
          `/api/v1/leave-requests/${(applied.body as { id: string }).id}/approve`,
          admin,
          {},
        ),
        { params: Promise.resolve({ id: (applied.body as { id: string }).id }) },
      ),
    );
    expect(approved.status).toBe(200);
    const roster = await json(
      await attendanceGet(
        req("GET", `/api/v1/attendance/students?sectionId=${sectionId}&date=2026-08-11`, admin),
      ),
    );
    const row = (roster.body as { data: Array<{ studentId: string; status: string }> }).data.find(
      (r) => r.studentId === studentId,
    );
    expect(row?.status).toBe("LEAVE");
    expect(row?.status).not.toBe("ABSENT");
  });

  it("locks old dates for teachers but not SuperAdmin", async () => {
    const old = "2026-01-02";
    await workingDaysPut(
      req("PUT", "/api/v1/working-days", admin, {
        date: old,
        isWorking: true,
        sessionId,
      }),
    );
    const teacherBlocked = await json(
      await attendancePut(
        req("PUT", "/api/v1/attendance/students", teacher, {
          date: old,
          sectionId,
          entries: [{ studentId, status: "PRESENT" }],
        }),
      ),
    );
    expect(teacherBlocked.status).toBe(403);

    const adminOk = await json(
      await attendancePut(
        req("PUT", "/api/v1/attendance/students", admin, {
          date: old,
          sectionId,
          entries: [{ studentId, status: "PRESENT" }],
        }),
      ),
    );
    expect(adminOk.status).toBe(200);
  });

  it("records staff attendance on a working day", async () => {
    if (!staffId) return;
    const marked = await json(
      await staffAttendancePut(
        req("PUT", "/api/v1/attendance/staff", admin, {
          date: workDate,
          entries: [{ staffId, status: "PRESENT", inTime: "09:00", outTime: "16:00" }],
        }),
      ),
    );
    expect(marked.status).toBe(200);
  });
});

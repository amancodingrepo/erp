import { beforeAll, describe, expect, it } from "vitest";
import { PUT as attendancePut, GET as attendanceGet } from "@/app/api/v1/attendance/students/route";
import { GET as reportGet } from "@/app/api/v1/attendance/students/report/route";
import { POST as classesPost } from "@/app/api/v1/classes/route";
import { POST as departmentsPost } from "@/app/api/v1/departments/route";
import { POST as approvePost } from "@/app/api/v1/leave-requests/[id]/approve/route";
import { POST as leavePost } from "@/app/api/v1/leave-requests/route";
import { POST as leaveTypesPost } from "@/app/api/v1/leave-types/route";
import { POST as programsPost } from "@/app/api/v1/programs/route";
import { POST as studentsPost } from "@/app/api/v1/students/route";
import { PUT as workingDaysPut } from "@/app/api/v1/working-days/route";
import { prisma } from "@/lib/db";
import { json, login, req } from "./helpers";

const suffix = `acc-att-${Date.now()}`;
const workDate = "2026-09-10";
const holiday = "2026-09-15";

describe("acceptance Attendance", () => {
  let admin: string;
  let sessionId: string;
  let sectionId: string;
  let studentId: string;

  beforeAll(async () => {
    const auth = await login("admin");
    if (!auth.token) throw new Error("login failed");
    admin = auth.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    sessionId = campus.currentSessionId;
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
        note: "Holiday",
        sessionId,
      }),
    );
  });

  it("Mark section for a working day", async () => {
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
  });

  it("Holiday date rejected unless override", async () => {
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

  it("Monthly % ignores holidays", async () => {
    const report = await json(
      await reportGet(
        req(
          "GET",
          `/api/v1/attendance/students/report?sectionId=${sectionId}&from=2026-09-01&to=2026-09-30`,
          admin,
        ),
      ),
    );
    expect(report.status).toBe(200);
    const row = (
      report.body as {
        data: Array<{ studentId: string; present: number; total: number; percent: number }>;
      }
    ).data.find((r) => r.studentId === studentId);
    expect(row?.present).toBe(1);
    expect(row?.total).toBe(1);
    expect(row?.percent).toBe(100);
  });

  it("Approved student leave codes as LEAVE not ABSENT", async () => {
    const type = await json(
      await leaveTypesPost(
        req("POST", "/api/v1/leave-types", admin, {
          name: `CL ${suffix}`,
          daysYear: 12,
        }),
      ),
    );
    const applied = await json(
      await leavePost(
        req("POST", "/api/v1/leave-requests", admin, {
          leaveTypeId: (type.body as { id: string }).id,
          studentId,
          fromDate: "2026-09-11",
          toDate: "2026-09-11",
          reason: "family",
        }),
      ),
    );
    expect(applied.status).toBe(201);
    await approvePost(
      req(
        "POST",
        `/api/v1/leave-requests/${(applied.body as { id: string }).id}/approve`,
        admin,
        {},
      ),
      { params: Promise.resolve({ id: (applied.body as { id: string }).id }) },
    );
    const roster = await json(
      await attendanceGet(
        req(
          "GET",
          `/api/v1/attendance/students?sectionId=${sectionId}&date=2026-09-11`,
          admin,
        ),
      ),
    );
    const row = (
      roster.body as { data: Array<{ studentId: string; status: string }> }
    ).data.find((r) => r.studentId === studentId);
    expect(row?.status).toBe("LEAVE");
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { GET as classesGet, POST as classesPost } from "@/app/api/v1/classes/route";
import {
  GET as classSubjectsGet,
  POST as classSubjectsPost,
} from "@/app/api/v1/class-subjects/route";
import { POST as departmentsPost } from "@/app/api/v1/departments/route";
import {
  GET as periodsGet,
  PATCH as periodsPatch,
  POST as periodsPost,
} from "@/app/api/v1/periods/route";
import { POST as programsPost } from "@/app/api/v1/programs/route";
import { POST as promotionsPost } from "@/app/api/v1/promotions/route";
import { POST as sectionsPost } from "@/app/api/v1/sections/route";
import { GET as sessionsGet, POST as sessionsPost } from "@/app/api/v1/sessions/route";
import { POST as activateSession } from "@/app/api/v1/sessions/[id]/activate/route";
import { POST as staffPost } from "@/app/api/v1/staff/route";
import { POST as studentsPost } from "@/app/api/v1/students/route";
import { POST as subjectsPost } from "@/app/api/v1/subjects/route";
import { GET as timetableGet, PUT as timetablePut } from "@/app/api/v1/timetable/route";
import {
  GET as workingDaysGet,
  PUT as workingDaysPut,
} from "@/app/api/v1/working-days/route";
import { prisma } from "@/lib/db";
import { promote } from "@/lib/services/promotion";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `t2-${Date.now()}`;

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

describe("Task 2 academics", () => {
  let token: string;
  let campusId: string;
  let originalSessionId: string | null;
  let departmentId: string;
  let programId: string;
  let fyClassId: string;
  let syClassId: string;
  let fyA: string;
  let fyB: string;
  let syA: string;
  let fromSessionId: string;
  let toSessionId: string;
  let subjectId: string;
  let periodId: string;
  let staffA: string;
  let staffB: string;
  let studentId: string;
  let examMarkId: string;

  beforeAll(async () => {
    const loginRes = await loginPost(
      new Request("http://local/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "admin",
          password: SEED_PASSWORD,
          portal: "staff",
        }),
      }),
    );
    const loginBody = (await loginRes.json()) as {
      token?: string;
      user?: { campusId: string };
    };
    if (!loginBody.token) {
      throw new Error(`login failed: ${loginRes.status}`);
    }
    token = loginBody.token;
    const campus = await prisma.campus.findFirst({
      where: { code: "MAIN" },
    });
    if (!campus) throw new Error("seed campus missing");
    campusId = campus.id;
    originalSessionId = campus.currentSessionId;

    const dept = await json(
      await departmentsPost(
        req("POST", "/api/v1/departments", token, {
          name: `Commerce ${suffix}`,
          code: `COM-${suffix}`,
        }),
      ),
    );
    expect(dept.status).toBe(201);
    departmentId = (dept.body as { id: string }).id;

    const program = await json(
      await programsPost(
        req("POST", "/api/v1/programs", token, {
          departmentId,
          name: `BCom ${suffix}`,
          level: "UNDERGRADUATE",
        }),
      ),
    );
    expect(program.status).toBe(201);
    programId = (program.body as { id: string }).id;

    const fy = await json(
      await classesPost(
        req("POST", "/api/v1/classes", token, {
          programId,
          name: `FY ${suffix}`,
          yearNo: 1,
          sectionNames: ["A", "B"],
        }),
      ),
    );
    expect(fy.status).toBe(201);
    fyClassId = (fy.body as { id: string }).id;
    const fySections = (fy.body as { sections: { id: string; name: string }[] })
      .sections;
    fyA = fySections.find((s) => s.name === "A")!.id;
    fyB = fySections.find((s) => s.name === "B")!.id;

    const sy = await json(
      await classesPost(
        req("POST", "/api/v1/classes", token, {
          programId,
          name: `SY ${suffix}`,
          yearNo: 2,
          sectionNames: ["A"],
        }),
      ),
    );
    expect(sy.status).toBe(201);
    syClassId = (sy.body as { id: string }).id;
    syA = (sy.body as { sections: { id: string }[] }).sections[0].id;

    const sub = await json(
      await subjectsPost(
        req("POST", "/api/v1/subjects", token, {
          name: `Accountancy ${suffix}`,
          code: `ACC-${suffix}`,
          kind: "theory",
        }),
      ),
    );
    expect(sub.status).toBe(201);
    subjectId = (sub.body as { id: string }).id;

    const sa = await json(
      await staffPost(
        req("POST", "/api/v1/staff", token, {
          employeeId: `EMP-A-${suffix}`,
          firstName: "Anita",
          lastName: "Shah",
        }),
      ),
    );
    const sb = await json(
      await staffPost(
        req("POST", "/api/v1/staff", token, {
          employeeId: `EMP-B-${suffix}`,
          firstName: "Bharat",
          lastName: "Patel",
        }),
      ),
    );
    expect(sa.status).toBe(201);
    expect(sb.status).toBe(201);
    staffA = (sa.body as { id: string }).id;
    staffB = (sb.body as { id: string }).id;
  });

  afterAll(async () => {
    if (originalSessionId) {
      await prisma.$transaction([
        prisma.academicSession.updateMany({
          where: { campusId },
          data: { isCurrent: false },
        }),
        prisma.academicSession.update({
          where: { id: originalSessionId },
          data: { isCurrent: true, isActive: true },
        }),
        prisma.campus.update({
          where: { id: campusId },
          data: { currentSessionId: originalSessionId },
        }),
      ]);
    }
  });

  it("rejects a duplicate section name in the same class with 409", async () => {
    const dup = await json(
      await sectionsPost(
        req("POST", "/api/v1/sections", token, {
          classId: fyClassId,
          name: "A",
        }),
      ),
    );
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe("conflict");

    const otherClass = await json(
      await sectionsPost(
        req("POST", "/api/v1/sections", token, {
          classId: syClassId,
          name: "C",
        }),
      ),
    );
    expect(otherClass.status).toBe(201);
  });

  it("activate session makes lists default to it", async () => {
    const created = await json(
      await sessionsPost(
        req("POST", "/api/v1/sessions", token, {
          name: `2026-27 ${suffix}`,
          code: `2627-${suffix}`,
          sequenceNo: 90,
          startDate: "2026-06-01",
          endDate: "2027-05-31",
        }),
      ),
    );
    expect(created.status).toBe(201);
    const sessionId = (created.body as { id: string }).id;
    fromSessionId = originalSessionId ?? sessionId;

    const activated = await json(
      await activateSession(req("POST", `/api/v1/sessions/${sessionId}/activate`, token), {
        params: Promise.resolve({ id: sessionId }),
      }),
    );
    expect(activated.status).toBe(200);

    const sessions = await json(await sessionsGet(req("GET", "/api/v1/sessions", token)));
    expect(sessions.status).toBe(200);
    expect(sessions.body.currentSessionId).toBe(sessionId);

    const classes = await json(await classesGet(req("GET", "/api/v1/classes", token)));
    expect(classes.status).toBe(200);
    expect(classes.body.sessionId).toBe(sessionId);

    const days = await json(
      await workingDaysGet(req("GET", "/api/v1/working-days", token)),
    );
    expect(days.status).toBe(200);
    expect(days.body.sessionId).toBe(sessionId);

    toSessionId = sessionId;
  });

  it("period CRUD and ClassSubject.staffId assignment", async () => {
    const created = await json(
      await periodsPost(
        req("POST", "/api/v1/periods", token, {
          name: "P1",
          startTime: "09:00",
          endTime: "09:50",
          sortOrder: 1,
        }),
      ),
    );
    expect(created.status).toBe(201);
    periodId = (created.body as { id: string }).id;

    const patched = await json(
      await periodsPatch(
        req("PATCH", "/api/v1/periods", token, {
          id: periodId,
          name: "Period 1",
        }),
      ),
    );
    expect(patched.status).toBe(200);
    expect((patched.body as { name: string }).name).toBe("Period 1");

    const listed = await json(await periodsGet(req("GET", "/api/v1/periods", token)));
    expect(listed.status).toBe(200);
    const rows = (listed.body as { data: { id: string; name: string }[] }).data;
    expect(rows.some((p) => p.id === periodId && p.name === "Period 1")).toBe(true);

    const offering = await json(
      await classSubjectsPost(
        req("POST", "/api/v1/class-subjects", token, {
          classId: fyClassId,
          sectionId: fyA,
          subjectId,
          staffId: staffA,
          sessionId: toSessionId,
        }),
      ),
    );
    expect(offering.status).toBe(201);
    expect((offering.body as { staffId: string }).staffId).toBe(staffA);

    const offerings = await json(
      await classSubjectsGet(
        req(
          "GET",
          `/api/v1/class-subjects?classId=${fyClassId}&sessionId=${toSessionId}`,
          token,
        ),
      ),
    );
    expect(offerings.status).toBe(200);
    const data = (offerings.body as { data: { staffId: string; subjectId: string }[] })
      .data;
    expect(data.some((o) => o.subjectId === subjectId && o.staffId === staffA)).toBe(
      true,
    );
  });

  it("timetable PUT detects staff and room clashes", async () => {
    const okPut = await json(
      await timetablePut(
        req("PUT", "/api/v1/timetable", token, {
          sectionId: fyA,
          sessionId: toSessionId,
          slots: [
            {
              weekday: 1,
              periodId,
              subjectId,
              staffId: staffA,
              room: "R1",
            },
          ],
        }),
      ),
    );
    expect(okPut.status).toBe(200);

    const staffClash = await json(
      await timetablePut(
        req("PUT", "/api/v1/timetable", token, {
          sectionId: fyB,
          sessionId: toSessionId,
          slots: [
            {
              weekday: 1,
              periodId,
              subjectId,
              staffId: staffA,
              room: "R2",
            },
          ],
        }),
      ),
    );
    expect(staffClash.status).toBe(409);
    expect(staffClash.body.error).toBe("conflict");

    const roomClash = await json(
      await timetablePut(
        req("PUT", "/api/v1/timetable", token, {
          sectionId: fyB,
          sessionId: toSessionId,
          slots: [
            {
              weekday: 1,
              periodId,
              subjectId,
              staffId: staffB,
              room: "R1",
            },
          ],
        }),
      ),
    );
    expect(roomClash.status).toBe(409);
    expect(roomClash.body.error).toBe("conflict");

    const other = await json(
      await timetablePut(
        req("PUT", "/api/v1/timetable", token, {
          sectionId: fyB,
          sessionId: toSessionId,
          slots: [
            {
              weekday: 1,
              periodId,
              subjectId,
              staffId: staffB,
              room: "R2",
            },
          ],
        }),
      ),
    );
    expect(other.status).toBe(200);

    const grid = await json(
      await timetableGet(
        req("GET", `/api/v1/timetable?sectionId=${fyA}`, token),
      ),
    );
    expect(grid.status).toBe(200);
    expect(grid.body.sessionId).toBe(toSessionId);
    const slots = (grid.body as { data: { room: string }[] }).data;
    expect(slots[0]?.room).toBe("R1");
  });

  it("marks a date working or holiday", async () => {
    const put = await json(
      await workingDaysPut(
        req("PUT", "/api/v1/working-days", token, {
          date: "2026-08-15",
          isWorking: false,
          note: "Independence Day",
        }),
      ),
    );
    expect(put.status).toBe(200);
    expect((put.body as { isWorking: boolean }).isWorking).toBe(false);

    const listed = await json(
      await workingDaysGet(
        req(
          "GET",
          "/api/v1/working-days?from=2026-08-01&to=2026-08-31",
          token,
        ),
      ),
    );
    expect(listed.status).toBe(200);
    const data = (
      listed.body as { data: { date: string; isWorking: boolean; note: string }[] }
    ).data;
    const row = data.find((d) => String(d.date).startsWith("2026-08-15"));
    expect(row?.isWorking).toBe(false);
    expect(row?.note).toBe("Independence Day");
  });

  it("promotes in one transaction without copying or deleting ExamMark", async () => {
    const fromSession =
      originalSessionId ??
      (await prisma.academicSession.findFirst({
        where: { campusId, name: "2025-26" },
      }))!.id;

    await prisma.$transaction([
      prisma.academicSession.updateMany({
        where: { campusId },
        data: { isCurrent: false },
      }),
      prisma.academicSession.update({
        where: { id: fromSession },
        data: { isCurrent: true, isActive: true },
      }),
      prisma.campus.update({
        where: { id: campusId },
        data: { currentSessionId: fromSession },
      }),
    ]);
    fromSessionId = fromSession;

    const student = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo: `ADM-${suffix}`,
          firstName: "Priya",
          lastName: "Mehta",
          classId: fyClassId,
          sectionId: fyA,
          sessionId: fromSessionId,
          rollNo: "101",
        }),
      ),
    );
    expect(student.status).toBe(201);
    studentId = (student.body as { id: string }).id;

    const group = await prisma.examGroup.create({
      data: {
        campusId,
        sessionId: fromSessionId,
        name: `Regular ${suffix}`,
        examType: "COLLEGE_GRADE",
        exams: {
          create: {
            name: "Term 1",
            subjects: {
              create: {
                subjectId,
                maxMarks: 100,
                minMarks: 40,
              },
            },
          },
        },
      },
      include: { exams: { include: { subjects: true } } },
    });
    const examSubjectId = group.exams[0].subjects[0].id;
    const mark = await prisma.examMark.create({
      data: {
        examSubjectId,
        studentId,
        marks: 77,
      },
    });
    examMarkId = mark.id;

    const result = await promote({
      campusId,
      fromSectionId: fyA,
      toSectionId: syA,
      toSessionId,
      studentIds: [studentId],
    });
    expect(result.promoted).toBe(1);

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { studentId },
      orderBy: { sessionId: "asc" },
    });
    const oldRow = enrollments.find((e) => e.sessionId === fromSessionId);
    const newRow = enrollments.find((e) => e.sessionId === toSessionId);
    expect(oldRow?.isCurrent).toBe(false);
    expect(oldRow?.sectionId).toBe(fyA);
    expect(newRow?.isCurrent).toBe(true);
    expect(newRow?.sectionId).toBe(syA);

    const stillThere = await prisma.examMark.findUnique({
      where: { id: examMarkId },
    });
    expect(stillThere).not.toBeNull();
    expect(Number(stillThere?.marks)).toBe(77);

    const viaApi = await json(
      await promotionsPost(
        req("POST", "/api/v1/promotions", token, {
          fromSectionId: fyA,
          toSectionId: syA,
          toSessionId,
          studentIds: [studentId],
        }),
      ),
    );
    expect(viaApi.status).toBe(200);
    expect(viaApi.body.promoted).toBe(0);

    const marksAfter = await prisma.examMark.count({
      where: { studentId },
    });
    expect(marksAfter).toBe(1);
  });

  it("rejects empty studentIds with 422", async () => {
    const viaApi = await json(
      await promotionsPost(
        req("POST", "/api/v1/promotions", token, {
          fromSectionId: fyA,
          toSectionId: syA,
          toSessionId,
          studentIds: [],
        }),
      ),
    );
    expect(viaApi.status).toBe(422);
    expect(viaApi.body.error).toBe("validation_error");

    await expect(
      promote({
        campusId,
        fromSectionId: fyA,
        toSectionId: syA,
        toSessionId,
        studentIds: [],
      }),
    ).rejects.toMatchObject({ status: 422, code: "validation_error" });
  });

  it("promotes a second student into a section that already has someone", async () => {
    const second = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo: `ADM2-${suffix}`,
          firstName: "Rahul",
          lastName: "Joshi",
          classId: fyClassId,
          sectionId: fyA,
          sessionId: fromSessionId,
          rollNo: "102",
        }),
      ),
    );
    expect(second.status).toBe(201);
    const student2 = (second.body as { id: string }).id;

    const intoOccupied = await promote({
      campusId,
      fromSectionId: fyA,
      toSectionId: syA,
      toSessionId,
      studentIds: [student2],
    });
    expect(intoOccupied.promoted).toBe(1);

    const third = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo: `ADM3-${suffix}`,
          firstName: "Neha",
          lastName: "Khan",
          classId: fyClassId,
          sectionId: fyA,
          sessionId: fromSessionId,
          rollNo: "103",
        }),
      ),
    );
    const fourth = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo: `ADM4-${suffix}`,
          firstName: "Amit",
          lastName: "Desai",
          classId: fyClassId,
          sectionId: fyA,
          sessionId: fromSessionId,
          rollNo: "104",
        }),
      ),
    );
    const student3 = (third.body as { id: string }).id;
    const student4 = (fourth.body as { id: string }).id;

    const sameSectionFirst = await promote({
      campusId,
      fromSectionId: fyA,
      toSectionId: fyA,
      toSessionId,
      studentIds: [student3],
    });
    expect(sameSectionFirst.promoted).toBe(1);

    const sameSectionSecond = await promote({
      campusId,
      fromSectionId: fyA,
      toSectionId: fyA,
      toSessionId,
      studentIds: [student4],
    });
    expect(sameSectionSecond.promoted).toBe(1);

    const inTarget = await prisma.studentEnrollment.count({
      where: { sessionId: toSessionId, sectionId: fyA, isCurrent: true },
    });
    expect(inTarget).toBeGreaterThanOrEqual(2);
  });
});

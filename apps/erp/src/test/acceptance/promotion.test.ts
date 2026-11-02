import { beforeAll, describe, expect, it } from "vitest";
import { POST as classesPost } from "@/app/api/v1/classes/route";
import { POST as departmentsPost } from "@/app/api/v1/departments/route";
import { POST as programsPost } from "@/app/api/v1/programs/route";
import { POST as sessionsPost } from "@/app/api/v1/sessions/route";
import { POST as studentsPost } from "@/app/api/v1/students/route";
import { POST as subjectsPost } from "@/app/api/v1/subjects/route";
import { prisma } from "@/lib/db";
import { promote } from "@/lib/services/promotion";
import { json, login, req } from "./helpers";

const suffix = `acc-pro-${Date.now()}`;

describe("acceptance Promotion", () => {
  let token: string;
  let campusId: string;
  let fromSessionId: string;
  let toSessionId: string;
  let fyA: string;
  let syA: string;
  let studentId: string;
  let examMarkId: string;

  beforeAll(async () => {
    const auth = await login("admin");
    if (!auth.token) throw new Error("login failed");
    token = auth.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    campusId = campus.id;
    fromSessionId = campus.currentSessionId;
    const next = await json(
      await sessionsPost(
        req("POST", "/api/v1/sessions", token, {
          name: `Next ${suffix}`,
          code: `NXT-${suffix}`,
          sequenceNo: 92,
          startDate: "2026-06-01",
          endDate: "2027-05-31",
        }),
      ),
    );
    toSessionId = (next.body as { id: string }).id;
    const dept = await json(
      await departmentsPost(
        req("POST", "/api/v1/departments", token, {
          name: `Pro ${suffix}`,
          code: `PRO-${suffix}`,
        }),
      ),
    );
    const program = await json(
      await programsPost(
        req("POST", "/api/v1/programs", token, {
          departmentId: (dept.body as { id: string }).id,
          name: `BA ${suffix}`,
          level: "UNDERGRADUATE",
        }),
      ),
    );
    const fy = await json(
      await classesPost(
        req("POST", "/api/v1/classes", token, {
          programId: (program.body as { id: string }).id,
          name: `FY ${suffix}`,
          yearNo: 1,
          sectionNames: ["A"],
        }),
      ),
    );
    const sy = await json(
      await classesPost(
        req("POST", "/api/v1/classes", token, {
          programId: (program.body as { id: string }).id,
          name: `SY ${suffix}`,
          yearNo: 2,
          sectionNames: ["A"],
        }),
      ),
    );
    fyA = (fy.body as { sections: { id: string }[] }).sections[0].id;
    syA = (sy.body as { sections: { id: string }[] }).sections[0].id;
    const student = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo: `PR-${suffix}`,
          firstName: "Priya",
          classId: (fy.body as { id: string }).id,
          sectionId: fyA,
          sessionId: fromSessionId,
        }),
      ),
    );
    studentId = (student.body as { id: string }).id;
    const sub = await json(
      await subjectsPost(
        req("POST", "/api/v1/subjects", token, {
          name: `Hist ${suffix}`,
          code: `HIS-${suffix}`,
        }),
      ),
    );
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
                subjectId: (sub.body as { id: string }).id,
                maxMarks: 100,
                minMarks: 40,
              },
            },
          },
        },
      },
      include: { exams: { include: { subjects: true } } },
    });
    const mark = await prisma.examMark.create({
      data: {
        examSubjectId: group.exams[0].subjects[0].id,
        studentId,
        marks: 77,
      },
    });
    examMarkId = mark.id;
  });

  it("Promote section FY-A → SY-A next session", async () => {
    const result = await promote({
      campusId,
      fromSectionId: fyA,
      toSectionId: syA,
      toSessionId,
      studentIds: [studentId],
    });
    expect(result.promoted).toBe(1);
  });

  it("Old enrollment remains isCurrent=false", async () => {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { studentId },
    });
    const oldRow = enrollments.find((e) => e.sessionId === fromSessionId);
    const newRow = enrollments.find((e) => e.sessionId === toSessionId);
    expect(oldRow?.isCurrent).toBe(false);
    expect(newRow?.isCurrent).toBe(true);
    expect(newRow?.sectionId).toBe(syA);
  });

  it("Marks of previous session still queryable", async () => {
    const stillThere = await prisma.examMark.findUnique({ where: { id: examMarkId } });
    expect(stillThere).not.toBeNull();
    expect(Number(stillThere?.marks)).toBe(77);
  });
});

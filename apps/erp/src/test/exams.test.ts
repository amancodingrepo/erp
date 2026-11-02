import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as classesPost } from "@/app/api/v1/classes/route";
import { POST as departmentsPost } from "@/app/api/v1/departments/route";
import { POST as programsPost } from "@/app/api/v1/programs/route";
import { POST as studentsPost } from "@/app/api/v1/students/route";
import { POST as subjectsPost } from "@/app/api/v1/subjects/route";
import { POST as groupsPost } from "@/app/api/v1/exam-groups/route";
import { POST as examsPost } from "@/app/api/v1/exam-groups/[id]/exams/route";
import { POST as papersPost } from "@/app/api/v1/exams/[id]/subjects/route";
import { PUT as marksPut } from "@/app/api/v1/exams/[id]/marks/route";
import { POST as finalizePost } from "@/app/api/v1/exams/[id]/finalize/route";
import { GET as rosterGet } from "@/app/api/v1/exams/[id]/roster/route";
import { POST as blockPost } from "@/app/api/v1/students/[id]/result-block/route";
import { GET as marksheetGet } from "@/app/api/v1/students/[id]/marksheet/route";
import { POST as gradesPost } from "@/app/api/v1/grades/route";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `t6-${Date.now()}`;

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

describe("Task 6 examinations", () => {
  let admin: string;
  let teacher: string;
  let sessionId: string;
  let classId: string;
  let sectionId: string;
  let subjectId: string;
  let groupId: string;
  let examId: string;
  let examSubjectId: string;
  let studentA: string;
  let studentB: string;

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
      if (!body.token) throw new Error(`login failed ${username}`);
      return body.token;
    }
    admin = await login("admin");
    teacher = await login("teacher");
    const { prisma } = await import("@/lib/db");
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    sessionId = campus.currentSessionId;

    const dept = await json(
      await departmentsPost(
        req("POST", "/api/v1/departments", admin, { name: `Exam ${suffix}`, code: `EX-${suffix}` }),
      ),
    );
    const program = await json(
      await programsPost(
        req("POST", "/api/v1/programs", admin, {
          departmentId: (dept.body as { id: string }).id,
          name: `BSc ${suffix}`,
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
    classId = (klass.body as { id: string }).id;
    sectionId = (klass.body as { sections: { id: string }[] }).sections[0].id;
    const sub = await json(
      await subjectsPost(
        req("POST", "/api/v1/subjects", admin, { name: `Physics ${suffix}`, code: `PHY-${suffix}` }),
      ),
    );
    subjectId = (sub.body as { id: string }).id;
    const a = await json(
      await studentsPost(
        req("POST", "/api/v1/students", admin, {
          admissionNo: `EA-${suffix}`,
          firstName: "Asha",
          classId,
          sectionId,
          sessionId,
        }),
      ),
    );
    const b = await json(
      await studentsPost(
        req("POST", "/api/v1/students", admin, {
          admissionNo: `EB-${suffix}`,
          firstName: "Bala",
          classId,
          sectionId,
          sessionId,
        }),
      ),
    );
    studentA = (a.body as { id: string }).id;
    studentB = (b.body as { id: string }).id;
  });

  it("creates Regular COLLEGE_GRADE and independent ATKT groups", async () => {
    const regular = await json(
      await groupsPost(
        req("POST", "/api/v1/exam-groups", admin, {
          name: `Regular ${suffix}`,
          examType: "COLLEGE_GRADE",
          groupKind: "Regular",
          sessionId,
        }),
      ),
    );
    expect(regular.status).toBe(201);
    groupId = (regular.body as { id: string }).id;

    const atkt = await json(
      await groupsPost(
        req("POST", "/api/v1/exam-groups", admin, {
          name: `ATKT ${suffix}`,
          examType: "COLLEGE_GRADE",
          groupKind: "ATKT",
          sessionId,
        }),
      ),
    );
    expect(atkt.status).toBe(201);
    expect((atkt.body as { groupKind: string }).groupKind).toBe("ATKT");
  });

  it("adds exam + subject max 100 min 40, marks one absent, finalizes, teacher locked", async () => {
    const exam = await json(
      await examsPost(
        req("POST", `/api/v1/exam-groups/${groupId}/exams`, admin, { name: "Term 1" }),
        { params: Promise.resolve({ id: groupId }) },
      ),
    );
    expect(exam.status).toBe(201);
    examId = (exam.body as { id: string }).id;

    const paper = await json(
      await papersPost(
        req("POST", `/api/v1/exams/${examId}/subjects`, admin, {
          subjectId,
          maxMarks: 100,
          minMarks: 40,
        }),
        { params: Promise.resolve({ id: examId }) },
      ),
    );
    expect(paper.status).toBe(201);
    examSubjectId = (paper.body as { id: string }).id;

    const roster = await json(
      await rosterGet(
        req("GET", `/api/v1/exams/${examSubjectId}/roster?sectionId=${sectionId}`, admin),
        { params: Promise.resolve({ id: examSubjectId }) },
      ),
    );
    expect(roster.status).toBe(200);
    expect((roster.body as { data: unknown[] }).data.length).toBeGreaterThanOrEqual(2);

    const over = await json(
      await marksPut(
        req("PUT", `/api/v1/exams/${examSubjectId}/marks`, admin, {
          entries: [{ studentId: studentA, marks: 101 }],
        }),
        { params: Promise.resolve({ id: examSubjectId }) },
      ),
    );
    expect(over.status).toBe(422);

    const saved = await json(
      await marksPut(
        req("PUT", `/api/v1/exams/${examSubjectId}/marks`, admin, {
          entries: [
            { studentId: studentA, marks: 88 },
            { studentId: studentB, isAbsent: true },
          ],
        }),
        { params: Promise.resolve({ id: examSubjectId }) },
      ),
    );
    expect(saved.status).toBe(200);

    const fin = await json(
      await finalizePost(
        req("POST", `/api/v1/exams/${examSubjectId}/finalize`, admin, {}),
        { params: Promise.resolve({ id: examSubjectId }) },
      ),
    );
    expect(fin.status).toBe(200);

    const teacherEdit = await json(
      await marksPut(
        req("PUT", `/api/v1/exams/${examSubjectId}/marks`, teacher, {
          entries: [{ studentId: studentA, marks: 90 }],
        }),
        { params: Promise.resolve({ id: examSubjectId }) },
      ),
    );
    expect(teacherEdit.status).toBe(403);
  });

  it("blocks a student result and marksheet returns withheld", async () => {
    const blocked = await json(
      await blockPost(
        req("POST", `/api/v1/students/${studentA}/result-block`, admin, {
          examGroupId: groupId,
          blocked: true,
          reason: "dues",
        }),
        { params: Promise.resolve({ id: studentA }) },
      ),
    );
    expect(blocked.status).toBe(200);

    const sheet = await json(
      await marksheetGet(
        req("GET", `/api/v1/students/${studentA}/marksheet?examGroupId=${groupId}`, admin),
        { params: Promise.resolve({ id: studentA }) },
      ),
    );
    expect(sheet.status).toBe(200);
    expect(sheet.body.status).toBe("withheld");
    expect(sheet.body.marks).toEqual([]);

    const pdf = await marksheetGet(
      req("GET", `/api/v1/students/${studentA}/marksheet?examGroupId=${groupId}&format=pdf`, admin),
      { params: Promise.resolve({ id: studentA }) },
    );
    expect(pdf.status).toBe(200);
    const text = Buffer.from(await pdf.arrayBuffer()).toString("latin1");
    expect(text.startsWith("%PDF")).toBe(true);
    expect(text).toContain("WITHHELD");
  });

  it("creates a grade band", async () => {
    const grade = await json(
      await gradesPost(
        req("POST", "/api/v1/grades", admin, {
          name: "First class",
          letter: "A",
          minPct: 60,
          maxPct: 100,
          points: 9,
        }),
      ),
    );
    expect(grade.status).toBe(201);
  });
});

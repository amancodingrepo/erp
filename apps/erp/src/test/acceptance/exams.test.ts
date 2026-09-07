import { beforeAll, describe, expect, it } from "vitest";
import { POST as classesPost } from "@/app/api/v1/classes/route";
import { POST as departmentsPost } from "@/app/api/v1/departments/route";
import { POST as examsPost } from "@/app/api/v1/exam-groups/[id]/exams/route";
import { POST as groupsPost } from "@/app/api/v1/exam-groups/route";
import { POST as finalizePost } from "@/app/api/v1/exams/[id]/finalize/route";
import { PUT as marksPut } from "@/app/api/v1/exams/[id]/marks/route";
import { POST as papersPost } from "@/app/api/v1/exams/[id]/subjects/route";
import { POST as programsPost } from "@/app/api/v1/programs/route";
import { GET as marksheetGet } from "@/app/api/v1/students/[id]/marksheet/route";
import { POST as blockPost } from "@/app/api/v1/students/[id]/result-block/route";
import { POST as studentsPost } from "@/app/api/v1/students/route";
import { POST as subjectsPost } from "@/app/api/v1/subjects/route";
import { prisma } from "@/lib/db";
import { json, login, req } from "./helpers";

const suffix = `acc-ex-${Date.now()}`;

describe("acceptance Exams", () => {
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
    const a = await login("admin");
    const t = await login("teacher");
    if (!a.token || !t.token) throw new Error("login failed");
    admin = a.token;
    teacher = t.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    sessionId = campus.currentSessionId;
    const dept = await json(
      await departmentsPost(
        req("POST", "/api/v1/departments", admin, {
          name: `Exam ${suffix}`,
          code: `EX-${suffix}`,
        }),
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
        req("POST", "/api/v1/subjects", admin, {
          name: `Physics ${suffix}`,
          code: `PHY-${suffix}`,
        }),
      ),
    );
    subjectId = (sub.body as { id: string }).id;
    const sa = await json(
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
    const sb = await json(
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
    studentA = (sa.body as { id: string }).id;
    studentB = (sb.body as { id: string }).id;
  });

  it("Exam group Regular + College grading", async () => {
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
  });

  it("ATKT group kind can be created independently", async () => {
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

  it("Add exam + subject max 100 min 40", async () => {
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
  });

  it("Enter marks; one student absent", async () => {
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
  });

  it("Finalize subject → further edit by teacher is 403", async () => {
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

  it("Block one student result → marksheet endpoint returns withheld", async () => {
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
        req(
          "GET",
          `/api/v1/students/${studentA}/marksheet?examGroupId=${groupId}`,
          admin,
        ),
        { params: Promise.resolve({ id: studentA }) },
      ),
    );
    expect(sheet.status).toBe(200);
    expect(sheet.body.status).toBe("withheld");
  });
});

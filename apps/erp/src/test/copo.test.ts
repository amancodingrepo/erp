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
import { POST as poPost } from "@/app/api/v1/copo/program-outcomes/route";
import { POST as coPost } from "@/app/api/v1/copo/course-outcomes/route";
import { POST as mapPost } from "@/app/api/v1/copo/mappings/route";
import { POST as assessPost } from "@/app/api/v1/copo/assessments/route";
import { POST as indirectPost } from "@/app/api/v1/copo/indirect/route";
import { GET as attainmentGet } from "@/app/api/v1/copo/attainment/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `copo-${Date.now()}`;

function req(token: string, payload?: unknown, path = "http://local/api") {
  return new Request(path, {
    method: payload ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(payload ? { "content-type": "application/json" } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

describe("Phase C CO-PO", () => {
  let token: string;
  let programId: string;
  let subjectId: string;
  let examSubjectId: string;
  let studentA: string;
  let studentB: string;

  beforeAll(async () => {
    const loginRes = await loginPost(
      req("x", { username: "admin", password: SEED_PASSWORD, portal: "staff" }),
    );
    const body = (await loginRes.json()) as { token?: string };
    if (!body.token) throw new Error("login failed");
    token = body.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");

    const dept = await departmentsPost(
      req(token, { name: `COPO ${suffix}`, code: `CP-${suffix}` }),
    );
    const deptId = ((await dept.json()) as { id: string }).id;
    const program = await programsPost(
      req(token, { departmentId: deptId, name: `BSc ${suffix}`, level: "UNDERGRADUATE" }),
    );
    programId = ((await program.json()) as { id: string }).id;
    const klass = await classesPost(
      req(token, {
        programId,
        name: `FY ${suffix}`,
        yearNo: 1,
        sectionNames: ["A"],
      }),
    );
    const klassBody = (await klass.json()) as {
      id: string;
      sections: { id: string }[];
    };
    const sub = await subjectsPost(
      req(token, { name: `OBE ${suffix}`, code: `OBE-${suffix}` }),
    );
    subjectId = ((await sub.json()) as { id: string }).id;
    const a = await studentsPost(
      req(token, {
        admissionNo: `CA-${suffix}`,
        firstName: "CoA",
        classId: klassBody.id,
        sectionId: klassBody.sections[0].id,
        sessionId: campus.currentSessionId,
      }),
    );
    const b = await studentsPost(
      req(token, {
        admissionNo: `CB-${suffix}`,
        firstName: "CoB",
        classId: klassBody.id,
        sectionId: klassBody.sections[0].id,
        sessionId: campus.currentSessionId,
      }),
    );
    studentA = ((await a.json()) as { id: string }).id;
    studentB = ((await b.json()) as { id: string }).id;
    const group = await groupsPost(
      req(token, {
        name: `OBE ${suffix}`,
        examType: "COLLEGE_GRADE",
        groupKind: "Regular",
        sessionId: campus.currentSessionId,
      }),
    );
    const groupId = ((await group.json()) as { id: string }).id;
    const exam = await examsPost(req(token, { name: "End" }), {
      params: Promise.resolve({ id: groupId }),
    });
    const paper = await papersPost(
      req(token, { subjectId, maxMarks: 100, minMarks: 40 }),
      { params: Promise.resolve({ id: ((await exam.json()) as { id: string }).id }) },
    );
    examSubjectId = ((await paper.json()) as { id: string }).id;
    await prisma.examMark.createMany({
      data: [
        { examSubjectId, studentId: studentA, marks: 40 },
        { examSubjectId, studentId: studentB, marks: 20 },
      ],
    });
  });

  it("rejects weight 4 and reports 80/20 attainment", async () => {
    const po = await poPost(
      req(token, { programId, code: `PO1-${suffix}`, title: "Knowledge" }),
    );
    expect(po.status).toBe(201);
    const poId = ((await po.json()) as { id: string }).id;
    const co = await coPost(
      req(token, { subjectId, code: `CO1-${suffix}`, title: "Solve" }),
    );
    expect(co.status).toBe(201);
    const coId = ((await co.json()) as { id: string }).id;
    const bad = await mapPost(
      req(token, { courseOutcomeId: coId, programOutcomeId: poId, weight: 4 }),
    );
    expect(bad.status).toBe(422);
    const map = await mapPost(
      req(token, { courseOutcomeId: coId, programOutcomeId: poId, weight: 3 }),
    );
    expect(map.status).toBe(201);
    const linked = await assessPost(
      req(token, { courseOutcomeId: coId, examSubjectId }),
    );
    expect(linked.status).toBe(201);
    const ind = await indirectPost(req(token, { programOutcomeId: poId, percent: 80 }));
    expect(ind.status).toBe(201);
    const report = await attainmentGet(
      req(token, undefined, `http://local/api/v1/copo/attainment?programId=${programId}`),
    );
    expect(report.status).toBe(200);
    const body = (await report.json()) as {
      data: Array<{ direct: number; overall: number }>;
    };
    expect(body.data[0]?.direct).toBe(50);
    expect(body.data[0]?.overall).toBe(56);
  });
});

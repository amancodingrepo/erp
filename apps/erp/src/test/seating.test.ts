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
import { POST as blockPost } from "@/app/api/v1/seating/blocks/route";
import { POST as allocatePost } from "@/app/api/v1/seating/allocate/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `seat-${Date.now()}`;

function req(token: string, payload: unknown) {
  return new Request("http://local/api", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

describe("Phase C seating", () => {
  let token: string;
  let examSubjectId: string;
  let classId: string;

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
      req(token, { name: `Seat ${suffix}`, code: `SE-${suffix}` }),
    );
    const deptId = ((await dept.json()) as { id: string }).id;
    const program = await programsPost(
      req(token, { departmentId: deptId, name: `BA ${suffix}`, level: "UNDERGRADUATE" }),
    );
    const programId = ((await program.json()) as { id: string }).id;
    const klass = await classesPost(
      req(token, { programId, name: `FY ${suffix}`, yearNo: 1, sectionNames: ["A"] }),
    );
    const klassBody = (await klass.json()) as { id: string; sections: { id: string }[] };
    classId = klassBody.id;
    const sub = await subjectsPost(req(token, { name: `Seat ${suffix}`, code: `ST-${suffix}` }));
    const subjectId = ((await sub.json()) as { id: string }).id;
    await studentsPost(
      req(token, {
        admissionNo: `SA-${suffix}`,
        firstName: "Ann",
        classId: klassBody.id,
        sectionId: klassBody.sections[0].id,
        sessionId: campus.currentSessionId,
      }),
    );
    await studentsPost(
      req(token, {
        admissionNo: `SB-${suffix}`,
        firstName: "Ben",
        classId: klassBody.id,
        sectionId: klassBody.sections[0].id,
        sessionId: campus.currentSessionId,
      }),
    );
    const group = await groupsPost(
      req(token, {
        name: `Seat ${suffix}`,
        examType: "COLLEGE_GRADE",
        groupKind: "Regular",
        sessionId: campus.currentSessionId,
      }),
    );
    const groupId = ((await group.json()) as { id: string }).id;
    const exam = await examsPost(req(token, { name: "Paper" }), {
      params: Promise.resolve({ id: groupId }),
    });
    const paper = await papersPost(
      req(token, { subjectId, maxMarks: 100, minMarks: 40 }),
      { params: Promise.resolve({ id: ((await exam.json()) as { id: string }).id }) },
    );
    examSubjectId = ((await paper.json()) as { id: string }).id;
  });

  it("rejects over-capacity then seats the roster", async () => {
    const small = await blockPost(req(token, { name: `Hall1-${suffix}`, capacity: 1 }));
    expect(small.status).toBe(201);
    const smallId = ((await small.json()) as { id: string }).id;
    const over = await allocatePost(
      req(token, { examSubjectId, blockIds: [smallId], classId }),
    );
    expect(over.status).toBe(422);
    const large = await blockPost(req(token, { name: `Hall2-${suffix}`, capacity: 2 }));
    expect(large.status).toBe(201);
    const largeId = ((await large.json()) as { id: string }).id;
    const ok = await allocatePost(
      req(token, { examSubjectId, blockIds: [largeId], classId }),
    );
    expect(ok.status).toBe(201);
    const body = (await ok.json()) as { data: Array<{ seatNo: string }> };
    expect(body.data).toHaveLength(2);
  });
});

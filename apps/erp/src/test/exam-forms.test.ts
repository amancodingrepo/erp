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
import { POST as windowPost } from "@/app/api/v1/exam-forms/windows/route";
import { POST as formPost } from "@/app/api/v1/exam-forms/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `ef-${Date.now()}`;

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

async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("Phase B ATKT revaluation", () => {
  let token: string;
  let sessionId: string;
  let studentId: string;
  let subjectId: string;
  let atktGroupId: string;
  let revalGroupId: string;
  let atktSubjectId: string;
  let revalSubjectId: string;

  beforeAll(async () => {
    const loginRes = await loginPost(
      req("x", { username: "admin", password: SEED_PASSWORD, portal: "staff" }),
    );
    const body = (await loginRes.json()) as { token?: string };
    if (!body.token) throw new Error("login failed");
    token = body.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    sessionId = campus.currentSessionId;

    const dept = await json(
      await departmentsPost(
        req(token, { name: `EF ${suffix}`, code: `EF-${suffix}` }),
      ),
    );
    const program = await json(
      await programsPost(
        req(token, {
          departmentId: (dept.body as { id: string }).id,
          name: `BA ${suffix}`,
          level: "UNDERGRADUATE",
        }),
      ),
    );
    const klass = await json(
      await classesPost(
        req(token, {
          programId: (program.body as { id: string }).id,
          name: `FY ${suffix}`,
          yearNo: 1,
          sectionNames: ["A"],
        }),
      ),
    );
    const classId = (klass.body as { id: string }).id;
    const sectionId = (klass.body as { sections: { id: string }[] }).sections[0].id;
    const sub = await json(
      await subjectsPost(
        req(token, { name: `Chem ${suffix}`, code: `CH-${suffix}` }),
      ),
    );
    subjectId = (sub.body as { id: string }).id;
    const student = await json(
      await studentsPost(
        req(token, {
          admissionNo: `EF-${suffix}`,
          firstName: "Esha",
          classId,
          sectionId,
          sessionId,
        }),
      ),
    );
    studentId = (student.body as { id: string }).id;

    const atkt = await json(
      await groupsPost(
        req(token, {
          name: `ATKT ${suffix}`,
          examType: "COLLEGE_GRADE",
          groupKind: "ATKT",
          sessionId,
        }),
      ),
    );
    atktGroupId = (atkt.body as { id: string }).id;
    const atktExam = await json(
      await examsPost(req(token, { name: "ATKT Term" }), {
        params: Promise.resolve({ id: atktGroupId }),
      }),
    );
    const atktPaper = await json(
      await papersPost(
        req(token, { subjectId, maxMarks: 100, minMarks: 40 }),
        { params: Promise.resolve({ id: (atktExam.body as { id: string }).id }) },
      ),
    );
    atktSubjectId = (atktPaper.body as { id: string }).id;

    const reval = await json(
      await groupsPost(
        req(token, {
          name: `Regular ${suffix}`,
          examType: "COLLEGE_GRADE",
          groupKind: "Regular",
          sessionId,
          revaluationOn: true,
        }),
      ),
    );
    revalGroupId = (reval.body as { id: string }).id;
    const revalExam = await json(
      await examsPost(req(token, { name: "Term 1" }), {
        params: Promise.resolve({ id: revalGroupId }),
      }),
    );
    const revalPaper = await json(
      await papersPost(
        req(token, { subjectId, maxMarks: 100, minMarks: 40 }),
        { params: Promise.resolve({ id: (revalExam.body as { id: string }).id }) },
      ),
    );
    revalSubjectId = (revalPaper.body as { id: string }).id;
  });

  it("rejects a closed ATKT window and posts a Decimal exam fee when open", async () => {
    const closed = await json(
      await windowPost(
        req(token, {
          kind: "ATKT",
          examGroupId: atktGroupId,
          opensAt: "2020-01-01T00:00:00.000Z",
          closesAt: "2020-01-02T00:00:00.000Z",
          feeAmount: "350.50",
        }),
      ),
    );
    expect(closed.status).toBe(201);
    const closedApply = await json(
      await formPost(
        req(token, {
          windowId: closed.body.id,
          studentId,
          subjectIds: [atktSubjectId],
        }),
      ),
    );
    expect(closedApply.status).toBe(422);

    const open = await json(
      await windowPost(
        req(token, {
          kind: "ATKT",
          examGroupId: atktGroupId,
          opensAt: new Date(Date.now() - 60_000).toISOString(),
          closesAt: new Date(Date.now() + 86_400_000).toISOString(),
          feeAmount: "350.50",
        }),
      ),
    );
    expect(open.status).toBe(201);
    const first = await json(
      await formPost(
        req(token, {
          windowId: open.body.id,
          studentId,
          subjectIds: [atktSubjectId],
        }),
      ),
    );
    expect(first.status).toBe(201);
    expect(Number(first.body.feeAmount)).toBe(350.5);
    const dup = await json(
      await formPost(
        req(token, {
          windowId: open.body.id,
          studentId,
          subjectIds: [atktSubjectId],
        }),
      ),
    );
    expect(dup.status).toBe(409);
  });

  it("refuses revaluation when the group flag is off", async () => {
    await prisma.examGroup.update({
      where: { id: revalGroupId },
      data: { revaluationOn: false },
    });
    const off = await json(
      await windowPost(
        req(token, {
          kind: "REVAL",
          examGroupId: revalGroupId,
          opensAt: new Date(Date.now() - 60_000).toISOString(),
          closesAt: new Date(Date.now() + 86_400_000).toISOString(),
          feeAmount: 200,
        }),
      ),
    );
    expect(off.status).toBe(422);

    await prisma.examGroup.update({
      where: { id: revalGroupId },
      data: { revaluationOn: true },
    });
    const on = await json(
      await windowPost(
        req(token, {
          kind: "REVAL",
          examGroupId: revalGroupId,
          opensAt: new Date(Date.now() - 60_000).toISOString(),
          closesAt: new Date(Date.now() + 86_400_000).toISOString(),
          feeAmount: 200,
        }),
      ),
    );
    expect(on.status).toBe(201);
    const applied = await json(
      await formPost(
        req(token, {
          windowId: on.body.id,
          studentId,
          subjectIds: [revalSubjectId],
        }),
      ),
    );
    expect(applied.status).toBe(201);
  });
});

import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as formPost } from "@/app/api/v1/feedback/forms/route";
import { POST as fieldPost } from "@/app/api/v1/feedback/fields/route";
import { POST as assignPost } from "@/app/api/v1/feedback/assignments/route";
import { POST as responsePost } from "@/app/api/v1/feedback/responses/route";
import { GET as reportGet } from "@/app/api/v1/feedback/report/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `fb-${Date.now()}`;

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

describe("Phase C feedback", () => {
  let token: string;
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
    if (!campus) throw new Error("seed campus missing");
    const a = await prisma.student.create({
      data: { campusId: campus.id, admissionNo: `FA-${suffix}`, firstName: "Fay" },
    });
    const b = await prisma.student.create({
      data: { campusId: campus.id, admissionNo: `FB-${suffix}`, firstName: "Flo" },
    });
    studentA = a.id;
    studentB = b.id;
  });

  it("rejects a closed window, blocks duplicates, and averages ratings", async () => {
    const form = await formPost(req(token, { name: `SSS ${suffix}` }));
    expect(form.status).toBe(201);
    const formId = ((await form.json()) as { id: string }).id;
    const field = await fieldPost(
      req(token, { formId, label: "Teaching", kind: "RATING" }),
    );
    expect(field.status).toBe(201);
    const fieldId = ((await field.json()) as { id: string }).id;

    const closed = await assignPost(
      req(token, {
        formId,
        opensAt: "2020-01-01T00:00:00.000Z",
        closesAt: "2020-01-02T00:00:00.000Z",
      }),
    );
    expect(closed.status).toBe(201);
    const closedId = ((await closed.json()) as { id: string }).id;
    const late = await responsePost(
      req(token, {
        assignmentId: closedId,
        respondentId: studentA,
        answers: { [fieldId]: 4 },
      }),
    );
    expect(late.status).toBe(422);

    const open = await assignPost(
      req(token, {
        formId,
        opensAt: new Date(Date.now() - 60_000).toISOString(),
        closesAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    );
    expect(open.status).toBe(201);
    const openId = ((await open.json()) as { id: string }).id;
    const first = await responsePost(
      req(token, {
        assignmentId: openId,
        respondentId: studentA,
        answers: { [fieldId]: 4 },
      }),
    );
    expect(first.status).toBe(201);
    const dup = await responsePost(
      req(token, {
        assignmentId: openId,
        respondentId: studentA,
        answers: { [fieldId]: 5 },
      }),
    );
    expect(dup.status).toBe(409);
    const second = await responsePost(
      req(token, {
        assignmentId: openId,
        respondentId: studentB,
        answers: { [fieldId]: 2 },
      }),
    );
    expect(second.status).toBe(201);
    const report = await reportGet(
      req(token, undefined, `http://local/api/v1/feedback/report?formId=${formId}`),
    );
    expect(report.status).toBe(200);
    const body = (await report.json()) as {
      fields: Array<{ average?: number }>;
    };
    expect(body.fields[0]?.average).toBe(3);
  });
});

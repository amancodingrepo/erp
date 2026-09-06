import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { GET as reportGet } from "@/app/api/v1/reports/[key]/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

async function login() {
  const res = await loginPost(
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
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error("login failed");
  return body.token;
}

describe("Task 10 reports", () => {
  let token: string;
  let campusId: string;
  let sessionId: string;
  let groupA: string;
  let groupB: string;

  beforeAll(async () => {
    token = await login();
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    campusId = campus.id;
    sessionId = campus.currentSessionId;
    const suffix = `t10-${Date.now()}`;
    const typeA = await prisma.feeType.create({
      data: { campusId, name: `Tuition ${suffix}` },
    });
    const typeB = await prisma.feeType.create({
      data: { campusId, name: `Hostel ${suffix}` },
    });
    const gA = await prisma.feeGroup.create({
      data: { campusId, name: `Regular ${suffix}` },
    });
    const gB = await prisma.feeGroup.create({
      data: { campusId, name: `Hostel ${suffix}` },
    });
    groupA = gA.id;
    groupB = gB.id;
    const masterA = await prisma.feeMaster.create({
      data: {
        campusId,
        sessionId,
        groupId: gA.id,
        lines: { create: { feeTypeId: typeA.id, amount: 1000 } },
      },
    });
    const masterB = await prisma.feeMaster.create({
      data: {
        campusId,
        sessionId,
        groupId: gB.id,
        lines: { create: { feeTypeId: typeB.id, amount: 500 } },
      },
    });
    const student = await prisma.student.create({
      data: {
        campusId,
        admissionNo: `RPT-${suffix}`,
        firstName: "Report",
        lastName: "Kid",
      },
    });
    await prisma.feeInvoice.create({
      data: {
        studentId: student.id,
        sessionId,
        masterId: masterA.id,
        status: "DUE",
        total: 1000,
        lines: {
          create: {
            feeTypeId: typeA.id,
            description: "Tuition",
            amount: 1000,
          },
        },
      },
    });
    await prisma.feeInvoice.create({
      data: {
        studentId: student.id,
        sessionId,
        masterId: masterB.id,
        status: "DUE",
        total: 500,
        lines: {
          create: {
            feeTypeId: typeB.id,
            description: "Hostel",
            amount: 500,
          },
        },
      },
    });
  });

  it("due report only unpaid lines of the selected fee group", async () => {
    const res = await reportGet(
      new Request(`http://local/api/v1/reports/dues?feeGroupId=${groupA}`, {
        headers: { authorization: `Bearer ${token}` },
      }),
      { params: Promise.resolve({ key: "dues" }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      rows: Array<{ feeGroup: string; description: string }>;
    };
    expect(body.rows.length).toBeGreaterThan(0);
    expect(body.rows.every((r) => r.feeGroup !== null)).toBe(true);
    expect(body.rows.some((r) => r.description === "Hostel")).toBe(false);
    expect(body.rows.some((r) => r.description === "Tuition")).toBe(true);
    void groupB;
  });
});

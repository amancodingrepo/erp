import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as classesPost } from "@/app/api/v1/classes/route";
import { POST as departmentsPost } from "@/app/api/v1/departments/route";
import { POST as programsPost } from "@/app/api/v1/programs/route";
import { POST as studentsPost } from "@/app/api/v1/students/route";
import { GET as studentGet } from "@/app/api/v1/students/[id]/route";
import { POST as feeTypesPost } from "@/app/api/v1/fee-types/route";
import { POST as feeGroupsPost } from "@/app/api/v1/fee-groups/route";
import { POST as feeMastersPost } from "@/app/api/v1/fee-masters/route";
import { POST as assignPost } from "@/app/api/v1/fee-masters/[id]/assign/route";
import { POST as payPost } from "@/app/api/v1/fees/payments/route";
import { POST as cancelPost } from "@/app/api/v1/fees/payments/[id]/cancel/route";
import { GET as dueGet } from "@/app/api/v1/fees/due/route";
import { GET as receiptGet } from "@/app/api/v1/fees/receipts/[receiptNo]/route";
import { GET as ledgerGet } from "@/app/api/v1/students/[id]/ledger/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `t4-${Date.now()}`;

function req(method: string, path: string, token: string, payload?: unknown, extra?: HeadersInit) {
  return new Request(`http://local${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(payload !== undefined ? { "content-type": "application/json" } : {}),
      ...extra,
    },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
}

async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("Task 4 fees collect", () => {
  let token: string;
  let sessionId: string;
  let classId: string;
  let sectionId: string;
  let groupId: string;
  let otherGroupId: string;
  let masterId: string;
  let studentA: string;
  let studentB: string;
  let enrollmentA: string;
  let invoiceA: string;
  let paymentId: string;
  let receiptNo: string;

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
    const loginBody = (await loginRes.json()) as { token?: string };
    if (!loginBody.token) throw new Error(`login failed: ${loginRes.status}`);
    token = loginBody.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    sessionId = campus.currentSessionId;

    const dept = await json(
      await departmentsPost(
        req("POST", "/api/v1/departments", token, {
          name: `Fees ${suffix}`,
          code: `FEE-${suffix}`,
        }),
      ),
    );
    const program = await json(
      await programsPost(
        req("POST", "/api/v1/programs", token, {
          departmentId: (dept.body as { id: string }).id,
          name: `BBA ${suffix}`,
          level: "UNDERGRADUATE",
        }),
      ),
    );
    const klass = await json(
      await classesPost(
        req("POST", "/api/v1/classes", token, {
          programId: (program.body as { id: string }).id,
          name: `FY ${suffix}`,
          yearNo: 1,
          sectionNames: ["A"],
        }),
      ),
    );
    classId = (klass.body as { id: string }).id;
    sectionId = (klass.body as { sections: { id: string }[] }).sections[0].id;

    const tuition = await json(
      await feeTypesPost(
        req("POST", "/api/v1/fee-types", token, { name: `Tuition ${suffix}` }),
      ),
    );
    const exam = await json(
      await feeTypesPost(
        req("POST", "/api/v1/fee-types", token, { name: `Exam ${suffix}` }),
      ),
    );
    const group = await json(
      await feeGroupsPost(
        req("POST", "/api/v1/fee-groups", token, { name: `FY Regular ${suffix}` }),
      ),
    );
    const other = await json(
      await feeGroupsPost(
        req("POST", "/api/v1/fee-groups", token, { name: `Hostel ${suffix}` }),
      ),
    );
    groupId = (group.body as { id: string }).id;
    otherGroupId = (other.body as { id: string }).id;

    const master = await json(
      await feeMastersPost(
        req("POST", "/api/v1/fee-masters", token, {
          sessionId,
          groupId,
          dueDate: "2026-06-01",
          lines: [
            { feeTypeId: (tuition.body as { id: string }).id, amount: 20000 },
            { feeTypeId: (exam.body as { id: string }).id, amount: 2000 },
          ],
        }),
      ),
    );
    expect(master.status).toBe(201);
    masterId = (master.body as { id: string }).id;

    const a = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo: `FA-${suffix}`,
          firstName: "Asha",
          lastName: "Nair",
          classId,
          sectionId,
          sessionId,
        }),
      ),
    );
    const b = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo: `FB-${suffix}`,
          firstName: "Bala",
          lastName: "Iyer",
          classId,
          sectionId,
          sessionId,
        }),
      ),
    );
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    studentA = (a.body as { id: string }).id;
    studentB = (b.body as { id: string }).id;
    const profile = await json(
      await studentGet(req("GET", `/api/v1/students/${studentA}`, token), {
        params: Promise.resolve({ id: studentA }),
      }),
    );
    enrollmentA = (profile.body as { enrollments: { id: string }[] }).enrollments[0].id;
  });

  it("assigns a master and invoices each student 22000", async () => {
    const assigned = await json(
      await assignPost(
        req("POST", `/api/v1/fee-masters/${masterId}/assign`, token, {
          classId,
          sessionId,
        }),
        { params: Promise.resolve({ id: masterId }) },
      ),
    );
    expect(assigned.status).toBe(200);
    expect(assigned.body.created).toBe(2);

    const invoices = await prisma.feeInvoice.findMany({
      where: { masterId, studentId: { in: [studentA, studentB] } },
    });
    expect(invoices).toHaveLength(2);
    for (const inv of invoices) {
      expect(Number(inv.total)).toBe(22000);
    }
    invoiceA = invoices.find((i) => i.studentId === studentA)!.id;
  });

  it("collects a partial payment, is idempotent, then pays rest+fine", async () => {
    const key = `idemp-${suffix}`;
    async function pay(amount: number, fine: number, idemp: string) {
      return json(
        await payPost(
          req(
            "POST",
            "/api/v1/fees/payments",
            token,
            {
              enrollmentId: enrollmentA,
              invoiceId: invoiceA,
              amount,
              fine,
              method: "CASH",
            },
            { "idempotency-key": idemp },
          ),
        ),
      );
    }

    const first = await pay(10000, 0, key);
    expect(first.status).toBe(201);
    receiptNo = first.body.receiptNo as string;
    paymentId = first.body.paymentId as string;
    expect(receiptNo).toMatch(/^RCP-/);
    expect((first.body.invoice as { status: string }).status).toBe("PARTIAL");

    const again = await pay(10000, 0, key);
    expect(again.status).toBe(200);
    expect(again.body.receiptNo).toBe(receiptNo);
    const count = await prisma.payment.count({
      where: { invoiceId: invoiceA, amount: { gt: 0 } },
    });
    expect(count).toBe(1);

    const rest = await pay(12000, 50, `idemp-rest-${suffix}`);
    expect(rest.status).toBe(201);
    expect((rest.body.invoice as { status: string }).status).toBe("PAID");
    expect(Number((rest.body.invoice as { paid: string }).paid)).toBe(22000);
  });

  it("cancels with a contra row and keeps the original receipt", async () => {
    const cancelled = await json(
      await cancelPost(
        req("POST", `/api/v1/fees/payments/${paymentId}/cancel`, token, {
          reason: "duplicate entry",
        }),
        { params: Promise.resolve({ id: paymentId }) },
      ),
    );
    expect(cancelled.status).toBe(200);
    const original = cancelled.body.payment as {
      receiptNo: string;
      cancelledAt: string | null;
      amount: string;
    };
    expect(original.receiptNo).toBe(receiptNo);
    expect(original.cancelledAt).toBeTruthy();
    expect(Number(original.amount)).toBe(10000);
    const contra = cancelled.body.contra as { amount: string; note: string };
    expect(Number(contra.amount)).toBe(-10000);
    expect(contra.note).toContain(receiptNo);
    expect((cancelled.body.invoice as { status: string }).status).toBe("PARTIAL");

    const stored = await prisma.payment.findUnique({ where: { id: paymentId } });
    expect(Number(stored?.amount)).toBe(10000);

    const pdfRes = await receiptGet(
      req("GET", `/api/v1/fees/receipts/${receiptNo}?format=pdf`, token),
      { params: Promise.resolve({ receiptNo }) },
    );
    expect(pdfRes.status).toBe(200);
    const bytes = new Uint8Array(await pdfRes.arrayBuffer());
    const text = Buffer.from(bytes).toString("latin1");
    expect(text.startsWith("%PDF")).toBe(true);
    expect(text).toContain("CANCELLED");
    expect(text).toContain(receiptNo);
  });

  it("due search returns only unpaid lines of the selected fee group", async () => {
    const hostelType = await json(
      await feeTypesPost(
        req("POST", "/api/v1/fee-types", token, { name: `Hostel ${suffix}` }),
      ),
    );
    const hostelMaster = await json(
      await feeMastersPost(
        req("POST", "/api/v1/fee-masters", token, {
          sessionId,
          groupId: otherGroupId,
          lines: [{ feeTypeId: (hostelType.body as { id: string }).id, amount: 5000 }],
        }),
      ),
    );
    await assignPost(
      req("POST", `/api/v1/fee-masters/${(hostelMaster.body as { id: string }).id}/assign`, token, {
        classId,
        sessionId,
      }),
      { params: Promise.resolve({ id: (hostelMaster.body as { id: string }).id }) },
    );

    const due = await json(
      await dueGet(
        req(
          "GET",
          `/api/v1/fees/due?classId=${classId}&feeGroupIds[]=${groupId}`,
          token,
        ),
      ),
    );
    expect(due.status).toBe(200);
    const rows = (due.body as { data: Array<{ feeGroup: string; description: string }> }).data;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.feeGroup === `FY Regular ${suffix}`)).toBe(true);
    expect(rows.some((r) => r.description.includes("Hostel"))).toBe(false);

    const ledger = await json(
      await ledgerGet(req("GET", `/api/v1/students/${studentA}/ledger`, token), {
        params: Promise.resolve({ id: studentA }),
      }),
    );
    expect(ledger.status).toBe(200);
    expect(Number((ledger.body as { invoices: unknown[] }).invoices.length)).toBeGreaterThan(0);
  });
});

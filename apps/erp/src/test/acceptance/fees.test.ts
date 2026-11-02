import { beforeAll, describe, expect, it } from "vitest";
import { POST as classesPost } from "@/app/api/v1/classes/route";
import { POST as departmentsPost } from "@/app/api/v1/departments/route";
import { POST as assignPost } from "@/app/api/v1/fee-masters/[id]/assign/route";
import { POST as feeGroupsPost } from "@/app/api/v1/fee-groups/route";
import { POST as feeMastersPost } from "@/app/api/v1/fee-masters/route";
import { POST as feeTypesPost } from "@/app/api/v1/fee-types/route";
import { GET as dueGet } from "@/app/api/v1/fees/due/route";
import { POST as cancelPost } from "@/app/api/v1/fees/payments/[id]/cancel/route";
import { POST as payPost } from "@/app/api/v1/fees/payments/route";
import { POST as programsPost } from "@/app/api/v1/programs/route";
import { GET as studentGet } from "@/app/api/v1/students/[id]/route";
import { POST as studentsPost } from "@/app/api/v1/students/route";
import { prisma } from "@/lib/db";
import { json, login, req } from "./helpers";

const suffix = `acc-fee-${Date.now()}`;

describe("acceptance Fees", () => {
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
    const auth = await login("admin");
    if (!auth.token) throw new Error("login failed");
    token = auth.token;
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
  });

  it("Master: group + two types (Tuition 20000, Exam 2000) for current session", async () => {
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
          classId,
          sectionId,
          sessionId,
        }),
      ),
    );
    studentA = (a.body as { id: string }).id;
    studentB = (b.body as { id: string }).id;
    const profile = await json(
      await studentGet(req("GET", `/api/v1/students/${studentA}`, token), {
        params: Promise.resolve({ id: studentA }),
      }),
    );
    enrollmentA = (profile.body as { enrollments: { id: string }[] }).enrollments[0].id;
  });

  it("Assign to class → each student gets invoice total 22000", async () => {
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
    const invoices = await prisma.feeInvoice.findMany({
      where: { masterId, studentId: { in: [studentA, studentB] } },
    });
    expect(invoices).toHaveLength(2);
    for (const inv of invoices) expect(Number(inv.total)).toBe(22000);
    invoiceA = invoices.find((i) => i.studentId === studentA)!.id;
  });

  it("Pay 10000 cash → status PARTIAL, receiptNo issued", async () => {
    const first = await json(
      await payPost(
        req(
          "POST",
          "/api/v1/fees/payments",
          token,
          {
            enrollmentId: enrollmentA,
            invoiceId: invoiceA,
            amount: 10000,
            fine: 0,
            method: "CASH",
          },
          { "idempotency-key": `acc-pay-${suffix}` },
        ),
      ),
    );
    expect(first.status).toBe(201);
    receiptNo = first.body.receiptNo as string;
    paymentId = first.body.paymentId as string;
    expect(receiptNo).toMatch(/^RCP-/);
    expect((first.body.invoice as { status: string }).status).toBe("PARTIAL");
  });

  it("Same Idempotency-Key twice → one payment", async () => {
    const again = await json(
      await payPost(
        req(
          "POST",
          "/api/v1/fees/payments",
          token,
          {
            enrollmentId: enrollmentA,
            invoiceId: invoiceA,
            amount: 10000,
            fine: 0,
            method: "CASH",
          },
          { "idempotency-key": `acc-pay-${suffix}` },
        ),
      ),
    );
    expect(again.status).toBe(200);
    expect(again.body.receiptNo).toBe(receiptNo);
    const count = await prisma.payment.count({
      where: { invoiceId: invoiceA, amount: { gt: 0 } },
    });
    expect(count).toBe(1);
  });

  it("Pay remaining + fine → PAID", async () => {
    const rest = await json(
      await payPost(
        req(
          "POST",
          "/api/v1/fees/payments",
          token,
          {
            enrollmentId: enrollmentA,
            invoiceId: invoiceA,
            amount: 12000,
            fine: 50,
            method: "CASH",
          },
          { "idempotency-key": `acc-rest-${suffix}` },
        ),
      ),
    );
    expect(rest.status).toBe(201);
    expect((rest.body.invoice as { status: string }).status).toBe("PAID");
  });

  it("Cancel receipt → contra, invoice reopens, original receipt stays in log", async () => {
    const cancelled = await json(
      await cancelPost(
        req("POST", `/api/v1/fees/payments/${paymentId}/cancel`, token, {
          reason: "duplicate entry",
        }),
        { params: Promise.resolve({ id: paymentId }) },
      ),
    );
    expect(cancelled.status).toBe(200);
    expect((cancelled.body.payment as { receiptNo: string }).receiptNo).toBe(receiptNo);
    expect((cancelled.body.payment as { cancelledAt: string | null }).cancelledAt).toBeTruthy();
    expect(Number((cancelled.body.contra as { amount: string }).amount)).toBe(-10000);
    const stored = await prisma.payment.findUnique({ where: { id: paymentId } });
    expect(Number(stored?.amount)).toBe(10000);
  });

  it("Due search filtered by fee group returns only unpaid lines of that group", async () => {
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
      req(
        "POST",
        `/api/v1/fee-masters/${(hostelMaster.body as { id: string }).id}/assign`,
        token,
        { classId, sessionId },
      ),
      { params: Promise.resolve({ id: (hostelMaster.body as { id: string }).id }) },
    );
    const due = await json(
      await dueGet(
        req("GET", `/api/v1/fees/due?classId=${classId}&feeGroupIds[]=${groupId}`, token),
      ),
    );
    expect(due.status).toBe(200);
    const rows = (due.body as { data: Array<{ feeGroup: string; description: string }> }).data;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.feeGroup === `FY Regular ${suffix}`)).toBe(true);
    expect(rows.some((r) => r.description.includes("Hostel"))).toBe(false);
  });
});

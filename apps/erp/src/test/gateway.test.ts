import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as merchantPost } from "@/app/api/v1/payment-merchants/route";
import { POST as webhookPost } from "@/app/api/v1/webhooks/razorpay/route";
import { hmacSha256Hex } from "@/lib/gateway-signature";
import { prisma } from "@/lib/db";
import { createFeeOrder } from "@/lib/services/gateway";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `gw-${Date.now()}`;
const WHSEC = "whsec_phase_b2_test";

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

describe("Phase B gateway webhooks", () => {
  let token: string;
  let campusId: string;
  let studentId: string;
  let invoiceId: string;
  let enrollmentId: string;

  beforeAll(async () => {
    const loginRes = await loginPost(
      req("POST", "/api/v1/auth/login", "x", {
        username: "admin",
        password: SEED_PASSWORD,
        portal: "staff",
      }),
    );
    const loginBody = (await loginRes.json()) as { token?: string };
    if (!loginBody.token) throw new Error("login failed");
    token = loginBody.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    campusId = campus.id;
    const created = await merchantPost(
      req("POST", "/api/v1/payment-merchants", token, {
        name: `Razorpay ${suffix}`,
        provider: "razorpay",
        keyId: "rzp_test_key",
        keySecret: "rzp_test_secret",
        webhookSecret: WHSEC,
        isDefault: true,
      }),
    );
    expect(created.status).toBe(201);

    const student = await prisma.student.create({
      data: {
        campusId,
        admissionNo: `GW-${suffix}`,
        firstName: "Gita",
      },
    });
    studentId = student.id;
    const klass = await prisma.class.findFirst({
      where: { program: { department: { campusId } } },
      include: { sections: true },
    });
    const enrollment = await prisma.studentEnrollment.create({
      data: {
        studentId,
        classId: klass!.id,
        sectionId: klass!.sections[0].id,
        sessionId: campus.currentSessionId,
        isCurrent: true,
      },
    });
    enrollmentId = enrollment.id;
    const feeType = await prisma.feeType.create({
      data: { campusId, name: `GW ${suffix}` },
    });
    const invoice = await prisma.feeInvoice.create({
      data: {
        studentId,
        sessionId: campus.currentSessionId,
        total: 500,
        status: "DUE",
        lines: {
          create: { feeTypeId: feeType.id, description: "Tuition", amount: 500 },
        },
      },
    });
    invoiceId = invoice.id;
    void enrollmentId;
  });

  it("rejects a webhook with a bad signature", async () => {
    const res = await webhookPost(
      new Request("http://local/api/v1/webhooks/razorpay", {
        method: "POST",
        headers: { "x-razorpay-signature": "deadbeef" },
        body: JSON.stringify({ event: "payment.captured" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("captures a signed payment.captured webhook once", async () => {
    const order = await createFeeOrder({
      campusId,
      studentId,
      invoiceId,
    });
    const payload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_${suffix}`,
            order_id: order.orderId,
            amount: order.amountPaise,
          },
        },
      },
    });
    const sig = hmacSha256Hex(WHSEC, payload);
    const first = await webhookPost(
      new Request("http://local/api/v1/webhooks/razorpay", {
        method: "POST",
        headers: { "x-razorpay-signature": sig, "content-type": "application/json" },
        body: payload,
      }),
    );
    expect(first.status).toBe(200);
    const invoice = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
    expect(Number(invoice?.paid)).toBe(500);
    const replay = await webhookPost(
      new Request("http://local/api/v1/webhooks/razorpay", {
        method: "POST",
        headers: { "x-razorpay-signature": sig, "content-type": "application/json" },
        body: payload,
      }),
    );
    expect(replay.status).toBe(200);
    const pays = await prisma.payment.count({
      where: { invoiceId, amount: { gt: 0 } },
    });
    expect(pays).toBe(1);
  });
});

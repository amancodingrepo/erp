import { PaymentMethod } from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { decryptField, encryptField } from "@/lib/crypto";
import { forbidden, notFound, validationError } from "@/lib/errors";
import {
  amountPaise,
  verifyCashfreeSignature,
  verifyRazorpaySignature,
} from "@/lib/gateway-signature";
import { markApplicationPaid } from "@/lib/services/applications";
import { collectPayment } from "@/lib/services/fees";
import { dec } from "@/lib/money";

export type GatewayProvider = "razorpay" | "cashfree";

type MerchantRow = {
  id: string;
  campusId: string;
  name: string;
  provider: string;
  keyId: string;
  keySecretEnc: string;
  webhookSecretEnc: string;
  isDefault: boolean;
  feeTypeId: string | null;
};

function secretOf(row: MerchantRow) {
  return decryptField(row.webhookSecretEnc) ?? "";
}

export async function listMerchants(campusId: string) {
  const rows = await prisma.paymentMerchant.findMany({
    where: { campusId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    provider: row.provider,
    keyId: row.keyId,
    isDefault: row.isDefault,
    feeTypeId: row.feeTypeId,
  }));
}

export async function upsertMerchant(
  campusId: string,
  input: {
    name: string;
    provider: GatewayProvider;
    keyId: string;
    keySecret: string;
    webhookSecret: string;
    isDefault?: boolean;
    feeTypeId?: string | null;
  },
) {
  if (input.isDefault) {
    await prisma.paymentMerchant.updateMany({
      where: { campusId, provider: input.provider },
      data: { isDefault: false },
    });
  }
  return prisma.paymentMerchant.create({
    data: {
      campusId,
      name: input.name,
      provider: input.provider,
      keyId: input.keyId,
      keySecretEnc: encryptField(input.keySecret) ?? "",
      webhookSecretEnc: encryptField(input.webhookSecret) ?? "",
      isDefault: Boolean(input.isDefault),
      feeTypeId: input.feeTypeId ?? null,
    },
  });
}

async function merchantsFor(campusId: string, provider: GatewayProvider) {
  const rows = await prisma.paymentMerchant.findMany({
    where: { campusId, provider },
  });
  if (rows.length) return rows;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (provider === "razorpay" && keyId && keySecret && webhookSecret) {
    return [
      {
        id: "env-razorpay",
        campusId,
        name: "Razorpay (env)",
        provider: "razorpay",
        keyId,
        keySecretEnc: encryptField(keySecret) ?? "",
        webhookSecretEnc: encryptField(webhookSecret) ?? "",
        isDefault: true,
        feeTypeId: null,
      } satisfies MerchantRow,
    ];
  }
  return [];
}

export async function pickMerchant(
  campusId: string,
  provider: GatewayProvider,
  feeTypeId?: string | null,
) {
  const rows = await merchantsFor(campusId, provider);
  if (!rows.length) throw validationError({ gateway: "not configured" });
  if (feeTypeId) {
    const mapped = rows.find((r) => r.feeTypeId === feeTypeId);
    if (mapped) return mapped;
  }
  return rows.find((r) => r.isDefault) ?? rows[0];
}

export async function createFeeOrder(input: {
  campusId: string;
  studentId: string;
  invoiceId: string;
  provider?: GatewayProvider;
}) {
  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: input.invoiceId, student: { campusId: input.campusId, id: input.studentId } },
    include: { lines: true, student: { include: { enrollments: { where: { isCurrent: true } } } } },
  });
  if (!invoice) throw notFound("invoice");
  const due = dec(invoice.total).minus(invoice.paid).minus(invoice.discount);
  if (due.lte(0)) throw validationError({ invoiceId: "already paid" });
  const enrollmentId = invoice.student.enrollments[0]?.id;
  if (!enrollmentId) throw validationError({ enrollmentId: "no current enrollment" });
  const provider = input.provider ?? "razorpay";
  const merchant = await pickMerchant(
    input.campusId,
    provider,
    invoice.lines[0]?.feeTypeId,
  );
  const order = await prisma.gatewayOrder.create({
    data: {
      campusId: input.campusId,
      merchantId: merchant.id.startsWith("env-") ? null : merchant.id,
      provider,
      providerOrderId: `order_${randomBytes(8).toString("hex")}`,
      amount: due,
      purpose: "FEE",
      invoiceId: invoice.id,
      enrollmentId,
      studentId: input.studentId,
    },
  });
  return {
    orderId: order.providerOrderId,
    keyId: merchant.keyId,
    amount: due.toString(),
    amountPaise: amountPaise(due),
    currency: "INR",
    provider,
  };
}

export async function createApplicationOrder(input: {
  campusId: string;
  applicationId: string;
  provider?: GatewayProvider;
}) {
  const row = await prisma.application.findFirst({
    where: { id: input.applicationId, campusId: input.campusId },
  });
  if (!row) throw notFound("application");
  if (row.paymentStatus === "PAID") {
    throw validationError({ paymentStatus: "already paid" });
  }
  const due = dec(row.feeAmount).minus(row.feePaid);
  const provider = input.provider ?? "razorpay";
  const merchant = await pickMerchant(input.campusId, provider);
  const order = await prisma.gatewayOrder.create({
    data: {
      campusId: input.campusId,
      merchantId: merchant.id.startsWith("env-") ? null : merchant.id,
      provider,
      providerOrderId: `order_${randomBytes(8).toString("hex")}`,
      amount: due,
      purpose: "APPLICATION",
      applicationId: row.id,
    },
  });
  return {
    orderId: order.providerOrderId,
    keyId: merchant.keyId,
    amount: due.toString(),
    amountPaise: amountPaise(due),
    currency: "INR",
    provider,
  };
}

export async function merchantMatchingSignature(input: {
  provider: GatewayProvider;
  rawBody: string;
  razorpaySignature?: string | null;
  cashfreeSignature?: string | null;
  cashfreeTimestamp?: string | null;
}): Promise<MerchantRow | null> {
  const all = await prisma.paymentMerchant.findMany({
    where: { provider: input.provider },
  });
  const envRows =
    input.provider === "razorpay"
      ? await merchantsFor(
          (await prisma.campus.findFirst())?.id ?? "",
          "razorpay",
        )
      : [];
  const candidates = all.length ? all : envRows;
  for (const row of candidates) {
    const secret = secretOf(row);
    const ok =
      input.provider === "razorpay"
        ? verifyRazorpaySignature(input.rawBody, input.razorpaySignature ?? null, secret)
        : verifyCashfreeSignature(
            input.rawBody,
            input.cashfreeSignature ?? null,
            input.cashfreeTimestamp ?? null,
            secret,
          );
    if (ok) return row;
  }
  return null;
}

export async function fulfillGatewayPayment(input: {
  providerOrderId: string;
  providerPaymentId: string;
  amountPaise: number;
}) {
  const order = await prisma.gatewayOrder.findUnique({
    where: { providerOrderId: input.providerOrderId },
  });
  if (!order) throw notFound("order");
  if (order.status === "PAID") {
    return { replayed: true, order };
  }
  if (amountPaise(order.amount) !== input.amountPaise) {
    throw validationError({ amount: "does not match order" });
  }
  if (order.purpose === "APPLICATION" && order.applicationId) {
    await markApplicationPaid(order.campusId, order.applicationId, "GATEWAY");
  } else if (order.purpose === "FEE" && order.invoiceId && order.enrollmentId) {
    await collectPayment({
      campusId: order.campusId,
      userId: "gateway",
      idempotencyKey: input.providerPaymentId,
      body: {
        enrollmentId: order.enrollmentId,
        invoiceId: order.invoiceId,
        amount: order.amount.toString(),
        method: PaymentMethod.GATEWAY,
        reference: input.providerPaymentId,
        note: `${order.provider} ${input.providerOrderId}`,
      },
    });
  } else {
    throw validationError({ purpose: "incomplete order" });
  }
  const paid = await prisma.gatewayOrder.update({
    where: { id: order.id },
    data: { status: "PAID" },
  });
  return { replayed: false, order: paid };
}

export function parseRazorpayCaptured(payload: {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number } };
    order?: { entity?: { id?: string; amount?: number } };
  };
}) {
  const event = payload.event ?? "";
  if (event !== "payment.captured" && event !== "order.paid") return null;
  const payment = payload.payload?.payment?.entity;
  const order = payload.payload?.order?.entity;
  const orderId = payment?.order_id ?? order?.id;
  const paymentId = payment?.id;
  const amount = payment?.amount ?? order?.amount;
  if (!orderId || !paymentId || typeof amount !== "number") return null;
  return { orderId, paymentId, amountPaise: amount };
}

export function parseCashfreeCaptured(payload: {
  type?: string;
  data?: { order?: { order_id?: string; order_amount?: number }; payment?: { cf_payment_id?: string } };
}) {
  const type = payload.type ?? "";
  if (!type.includes("PAYMENT_SUCCESS") && type !== "PAYMENT_CHARGES_WEBHOOK") {
    if (type && !type.toLowerCase().includes("success")) return null;
  }
  const orderId = payload.data?.order?.order_id;
  const paymentId = payload.data?.payment?.cf_payment_id;
  const amount = payload.data?.order?.order_amount;
  if (!orderId || !paymentId || amount == null) return null;
  return { orderId, paymentId, amountPaise: amountPaise(amount) };
}


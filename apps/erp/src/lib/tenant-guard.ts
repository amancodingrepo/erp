import type { PrismaClient } from "@prisma/client";
import { notFound } from "./errors";
import { currentTenant, type TenantScope } from "./tenant-context";

const GUARDED = new Set([
  "Student",
  "User",
  "FeeInvoice",
  "FeeInvoiceLine",
  "Payment",
  "StudentAttendance",
  "Exam",
  "ExamSubject",
  "ExamMark",
]);

const LIST_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

const UNIQUE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "delete",
  "upsert",
]);

type Row = Record<string, unknown>;

function delegate(base: PrismaClient, model: string) {
  const name = model.charAt(0).toLowerCase() + model.slice(1);
  return (base as unknown as Record<string, { findFirst: (args: unknown) => Promise<Row | null> }>)[name];
}

function campusIn(tenant: TenantScope) {
  return { in: tenant.campusIds };
}

function scopeWhere(model: string, tenant: TenantScope) {
  const campuses = campusIn(tenant);
  switch (model) {
    case "Student":
    case "User":
      return { campusId: campuses };
    case "StudentAttendance":
    case "FeeInvoice":
      return { student: { campusId: campuses } };
    case "FeeInvoiceLine":
    case "Payment":
      return { invoice: { student: { campusId: campuses } } };
    case "Exam":
      return { group: { campusId: campuses } };
    case "ExamSubject":
      return { exam: { group: { campusId: campuses } } };
    case "ExamMark":
      return { student: { campusId: campuses } };
    default:
      return null;
  }
}

function withScope(args: { where?: unknown }, scope: object) {
  const where = args.where;
  if (!where || typeof where !== "object" || !Object.keys(where as object).length) {
    return { ...args, where: scope };
  }
  return { ...args, where: { AND: [where, scope] } };
}

function belongs(campusId: unknown, tenant: TenantScope) {
  return typeof campusId === "string" && tenant.campusIds.includes(campusId);
}

function visible(model: string, row: Row, tenant: TenantScope) {
  if (model === "User" && row.id === tenant.actorId) return true;
  if (model === "Student" || model === "User") return belongs(row.campusId, tenant);
  if (model === "StudentAttendance" || model === "FeeInvoice" || model === "ExamMark") {
    const student = row.student as Row | undefined;
    return belongs(student?.campusId, tenant);
  }
  if (model === "FeeInvoiceLine" || model === "Payment") {
    const invoice = row.invoice as Row | undefined;
    const student = invoice?.student as Row | undefined;
    return belongs(student?.campusId, tenant);
  }
  if (model === "Exam") {
    const group = row.group as Row | undefined;
    return belongs(group?.campusId, tenant);
  }
  if (model === "ExamSubject") {
    const exam = row.exam as Row | undefined;
    const group = exam?.group as Row | undefined;
    return belongs(group?.campusId, tenant);
  }
  return false;
}

function gateSelect(model: string) {
  switch (model) {
    case "Student":
      return { id: true, campusId: true };
    case "User":
      return { id: true, campusId: true };
    case "StudentAttendance":
    case "FeeInvoice":
    case "ExamMark":
      return { student: { select: { campusId: true } } };
    case "FeeInvoiceLine":
    case "Payment":
      return { invoice: { select: { student: { select: { campusId: true } } } } };
    case "Exam":
      return { group: { select: { campusId: true } } };
    case "ExamSubject":
      return { exam: { select: { group: { select: { campusId: true } } } } };
    default:
      return { id: true };
  }
}

async function ownedCampus(base: PrismaClient, model: string, data: Row, tenant: TenantScope) {
  if (typeof data.campusId === "string" && !tenant.campusIds.includes(data.campusId)) {
    throw notFound(model);
  }
  if ((model === "FeeInvoice" || model === "StudentAttendance" || model === "ExamMark") && typeof data.studentId === "string") {
    const student = await base.student.findUnique({
      where: { id: data.studentId },
      select: { campusId: true },
    });
    if (!student || !tenant.campusIds.includes(student.campusId)) throw notFound(model);
  }
  if ((model === "FeeInvoiceLine" || model === "Payment") && typeof data.invoiceId === "string") {
    const invoice = await base.feeInvoice.findUnique({
      where: { id: data.invoiceId },
      select: { student: { select: { campusId: true } } },
    });
    if (!invoice || !tenant.campusIds.includes(invoice.student.campusId)) throw notFound(model);
  }
  if (model === "Exam" && typeof data.examGroupId === "string") {
    const group = await base.examGroup.findUnique({
      where: { id: data.examGroupId },
      select: { campusId: true },
    });
    if (!group || !tenant.campusIds.includes(group.campusId)) throw notFound("exam");
  }
  if (model === "ExamSubject" && typeof data.examId === "string") {
    const exam = await base.exam.findUnique({
      where: { id: data.examId },
      select: { group: { select: { campusId: true } } },
    });
    if (!exam || !tenant.campusIds.includes(exam.group.campusId)) throw notFound("exam");
  }
}

export function guardTenant<T extends PrismaClient>(base: T): T {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenant = currentTenant();
          if (!tenant || tenant.platform || !model || !GUARDED.has(model)) return query(args);
          const input = (args ?? {}) as { where?: unknown; data?: Row | Row[] };
          if (operation === "create" && input.data && !Array.isArray(input.data)) {
            await ownedCampus(base, model, input.data, tenant);
          }
          if (operation === "createMany" && Array.isArray(input.data)) {
            for (const row of input.data) await ownedCampus(base, model, row, tenant);
          }
          if (operation === "update" || operation === "upsert") {
            const data = input.data;
            if (data && !Array.isArray(data)) await ownedCampus(base, model, data, tenant);
          }
          const scope = scopeWhere(model, tenant);
          if (scope && LIST_OPS.has(operation)) {
            return query(withScope(input, scope));
          }
          if (scope && UNIQUE_OPS.has(operation) && input.where) {
            const gate = await delegate(base, model).findFirst({
              where: input.where,
              select: gateSelect(model),
            });
            if (gate && !visible(model, gate, tenant)) {
              if (operation === "findUnique") return null;
              throw notFound(model === "Exam" || model === "ExamSubject" ? "exam" : model);
            }
          }
          return query(args);
        },
      },
    },
  }) as unknown as T;
}

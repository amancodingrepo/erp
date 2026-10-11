import { FeedbackFieldKind, PaymentMethod, Prisma, StudentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { collectPayment } from "@/lib/services/fees";
import {
  addFeedbackField,
  assignFeedbackForm,
  createFeedbackForm,
  listFeedbackForms,
} from "@/lib/services/feedback";
import { upsertPrintTemplate } from "@/lib/services/print-docs";
import { addStock, issueStock } from "@/lib/services/remaining";
import {
  dropNamedMaster,
  parseNamedMasters,
  upsertNamedMaster,
} from "@/lib/services/academics-masters";
import { parseCsv } from "@/lib/services/students";
import { listCoScholastic } from "@/lib/services/campus-coscholastic";

export const SIBLING_GROUPS_KEY = "students.siblingGroups";
export const STORE_CATALOG_KEY = "store.catalog";
export const STORE_VENDORS_KEY = "store.vendors";
export const STORE_ORDERS_KEY = "store.orders";
export const QUESTIONNAIRE_KEY = "academics.questionnaires";
export const REPORT_TEMPLATE_KEY = "academics.reportTemplates";

export const STORE_PRODUCT_TYPES = ["product", "kit", "uniform", "bundle"] as const;
export type StoreProductType = (typeof STORE_PRODUCT_TYPES)[number];

export type SiblingGroup = { groupId: string; studentIds: string[] };

export type StoreCatalogRow = {
  itemId: string;
  sku: string;
  price: number;
  type: StoreProductType;
  vendor: string;
};

export type StoreOrder = {
  id: string;
  studentId: string;
  itemId: string;
  qty: number;
  amount: number;
  source: "staff" | "parent";
  status: "open" | "paid" | "delivered";
  gatewayOrderId: string;
};

export type QuizQuestion = { label: string; marks: number };

export type QuestionnaireExtra = {
  formId: string;
  type: string;
  validFrom: string;
  validTill: string;
  totalMarks: number;
  questions: QuizQuestion[];
};

export type ReportTemplateAssign = { sectionId: string; templateId: string };

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function readSetting(campusId: string, key: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key } },
  });
  return row?.value;
}

async function writeSetting(campusId: string, key: string, value: Prisma.InputJsonValue) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key } },
    update: { value },
    create: { campusId, key, value },
  });
}

export function parseSiblingGroups(value: unknown): SiblingGroup[] {
  if (!Array.isArray(value)) return [];
  const out: SiblingGroup[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const groupId = trim(rec.groupId);
    const studentIds = Array.isArray(rec.studentIds)
      ? [...new Set(rec.studentIds.map(trim).filter(Boolean))]
      : [];
    if (!groupId || studentIds.length < 2 || seen.has(groupId)) continue;
    seen.add(groupId);
    out.push({ groupId, studentIds });
  }
  return out;
}

export function mergeSiblingGroup(groups: SiblingGroup[], studentIds: string[]) {
  const ids = [...new Set(studentIds.map(trim).filter(Boolean))];
  if (ids.length < 2) throw validationError({ studentIds: "need two students" });
  const overlapping = groups.filter((g) =>
    g.studentIds.some((id) => ids.includes(id)),
  );
  const mergedIds = [
    ...new Set([...overlapping.flatMap((g) => g.studentIds), ...ids]),
  ];
  const groupId = overlapping[0]?.groupId ?? `sib-${ids[0]}`;
  return [
    ...groups.filter((g) => !overlapping.includes(g)),
    { groupId, studentIds: mergedIds },
  ];
}

export function siblingsOf(groups: SiblingGroup[], studentId: string) {
  const id = trim(studentId);
  const group = groups.find((g) => g.studentIds.includes(id));
  if (!group) return { groupId: null as string | null, studentIds: [] as string[] };
  return {
    groupId: group.groupId,
    studentIds: group.studentIds.filter((row) => row !== id),
  };
}

export function parseStoreCatalog(value: unknown): StoreCatalogRow[] {
  if (!Array.isArray(value)) return [];
  const out: StoreCatalogRow[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const itemId = trim(rec.itemId);
    if (!itemId || seen.has(itemId)) continue;
    seen.add(itemId);
    const type = STORE_PRODUCT_TYPES.includes(rec.type as StoreProductType)
      ? (rec.type as StoreProductType)
      : "product";
    out.push({
      itemId,
      sku: trim(rec.sku),
      price: Math.max(0, num(rec.price)),
      type,
      vendor: trim(rec.vendor),
    });
  }
  return out;
}

export function upsertStoreCatalog(
  rows: StoreCatalogRow[],
  itemId: string,
  patch: Partial<Omit<StoreCatalogRow, "itemId">>,
) {
  const id = trim(itemId);
  if (!id) throw validationError({ itemId: "required" });
  const previous = rows.find((row) => row.itemId === id);
  const type = patch.type ?? previous?.type ?? "product";
  const next: StoreCatalogRow = {
    itemId: id,
    sku: trim(patch.sku ?? previous?.sku ?? ""),
    price: Math.max(0, num(patch.price ?? previous?.price ?? 0)),
    type: STORE_PRODUCT_TYPES.includes(type) ? type : "product",
    vendor: trim(patch.vendor ?? previous?.vendor ?? ""),
  };
  return [...rows.filter((row) => row.itemId !== id), next];
}

export function parseStoreVendors(value: unknown) {
  return parseNamedMasters(value);
}

export function upsertStoreVendor(
  rows: ReturnType<typeof parseNamedMasters>,
  input: { id?: string; name: string },
) {
  return upsertNamedMaster(rows, input);
}

export function dropStoreVendor(
  rows: ReturnType<typeof parseNamedMasters>,
  id: string,
) {
  return dropNamedMaster(rows, id);
}

export function dropVendorFromCatalog(rows: StoreCatalogRow[], name: string) {
  const key = trim(name).toLowerCase();
  if (!key) return rows;
  return rows.map((row) =>
    row.vendor.toLowerCase() === key ? { ...row, vendor: "" } : row,
  );
}

export function dropStoreCatalogItem(rows: StoreCatalogRow[], itemId: string) {
  const id = trim(itemId);
  if (!id) return rows;
  return rows.filter((row) => row.itemId !== id);
}

export function dropQuestionnaireExtra(rows: QuestionnaireExtra[], formId: string) {
  const id = trim(formId);
  if (!id) return rows;
  return rows.filter((row) => row.formId !== id);
}

export function checkoutAmount(price: number, qty: number) {
  const n = Math.max(0, num(price) * Math.max(0, Math.trunc(num(qty))));
  return Math.round(n * 100) / 100;
}

export function attachStoreGateway(
  rows: StoreOrder[],
  orderId: string,
  gatewayOrderId: string,
) {
  const id = trim(orderId);
  const gw = trim(gatewayOrderId);
  if (!id || !gw) return rows;
  return rows.map((row) =>
    row.id === id ? { ...row, gatewayOrderId: gw } : row,
  );
}

export function markStorePaidByGateway(rows: StoreOrder[], gatewayOrderId: string) {
  const gw = trim(gatewayOrderId);
  if (!gw) return rows;
  return rows.map((row) =>
    row.gatewayOrderId === gw && row.status === "open"
      ? { ...row, status: "paid" as const }
      : row,
  );
}

export function attachStoreCatalog<T extends { id: string }>(
  items: T[],
  catalog: StoreCatalogRow[],
) {
  const byId = new Map(catalog.map((row) => [row.itemId, row]));
  return items.map((row) => ({
    ...row,
    catalog: byId.get(row.id) ?? null,
  }));
}

export function kitsFromProducts<T extends { catalog?: { type?: string } | null }>(
  rows: T[],
) {
  return rows.filter((row) => row.catalog?.type === "kit");
}

export function assertKitProduct<T extends { catalog?: { type?: string } | null }>(
  row: T,
) {
  if (row.catalog?.type !== "kit") throw notFound("kit");
  return row;
}

export function deliveredStoreOrders(rows: StoreOrder[]) {
  return rows.filter((row) => row.status === "delivered");
}

export function parseStoreOrders(value: unknown): StoreOrder[] {
  if (!Array.isArray(value)) return [];
  const out: StoreOrder[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const studentId = trim(rec.studentId);
    const itemId = trim(rec.itemId);
    const qty = Math.max(0, Math.trunc(num(rec.qty)));
    if (!id || !studentId || !itemId || qty < 1 || seen.has(id)) continue;
    seen.add(id);
    const status =
      rec.status === "delivered"
        ? "delivered"
        : rec.status === "paid"
          ? "paid"
          : "open";
    out.push({
      id,
      studentId,
      itemId,
      qty,
      amount: Math.max(0, num(rec.amount)),
      source: rec.source === "parent" ? "parent" : "staff",
      status,
      gatewayOrderId: trim(rec.gatewayOrderId),
    });
  }
  return out;
}

export function parseQuestionnaires(value: unknown): QuestionnaireExtra[] {
  if (!Array.isArray(value)) return [];
  const out: QuestionnaireExtra[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const formId = trim(rec.formId);
    if (!formId || seen.has(formId)) continue;
    seen.add(formId);
    const questions = Array.isArray(rec.questions)
      ? rec.questions
          .map((q) => {
            if (!q || typeof q !== "object") return null;
            const label = trim((q as Record<string, unknown>).label);
            const marks = Math.max(0, num((q as Record<string, unknown>).marks));
            if (!label) return null;
            return { label, marks };
          })
          .filter((q): q is QuizQuestion => Boolean(q))
      : [];
    out.push({
      formId,
      type: trim(rec.type) || "Quiz",
      validFrom: trim(rec.validFrom),
      validTill: trim(rec.validTill),
      totalMarks: Math.max(
        0,
        num(rec.totalMarks, questions.reduce((sum, q) => sum + q.marks, 0)),
      ),
      questions,
    });
  }
  return out;
}

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Record<string, unknown>,
) {
  let score = 0;
  const total = questions.reduce((sum, q) => sum + q.marks, 0);
  for (const question of questions) {
    const raw = answers[question.label];
    if (typeof raw === "number") {
      score += Math.min(question.marks, Math.max(0, raw));
    } else if (String(raw ?? "").trim().toLowerCase() === "correct") {
      score += question.marks;
    }
  }
  return { score, total };
}

export function parseReportTemplateAssigns(
  value: unknown,
): ReportTemplateAssign[] {
  if (!Array.isArray(value)) return [];
  const out: ReportTemplateAssign[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const sectionId = trim(rec.sectionId);
    const templateId = trim(rec.templateId);
    if (!sectionId || !templateId || seen.has(sectionId)) continue;
    seen.add(sectionId);
    out.push({ sectionId, templateId });
  }
  return out;
}

export function performanceAssigned(
  assigns: Array<{ sectionId: string; templateId?: string }>,
  sectionIds: string[],
) {
  const set = new Set(assigns.map((row) => row.sectionId));
  return sectionIds.some((id) => set.has(id));
}

export async function requirePerformanceTemplate(
  campusId: string,
  sectionIds: string[],
) {
  if (!performanceAssigned(await listReportTemplateAssigns(campusId), sectionIds)) {
    throw validationError({
      classId: "Performance report template is not assigned to selected class.",
    });
  }
}

export function dropReportTemplateAssignsByTemplate(
  rows: ReportTemplateAssign[],
  templateId: string,
) {
  const key = trim(templateId);
  if (!key) return rows;
  return rows.filter((row) => row.templateId !== key);
}

export function upsertReportTemplateAssign(
  rows: ReportTemplateAssign[],
  sectionId: string,
  templateId: string,
) {
  const sid = trim(sectionId);
  const tid = trim(templateId);
  if (!sid) throw validationError({ sectionId: "required" });
  if (!tid) throw validationError({ templateId: "required" });
  return [
    ...rows.filter((row) => row.sectionId !== sid),
    { sectionId: sid, templateId: tid },
  ];
}

export function assignTemplateToSections(
  rows: ReportTemplateAssign[],
  sectionIds: string[],
  templateId: string,
) {
  const tid = trim(templateId);
  if (!tid) throw validationError({ templateId: "required" });
  const ids = [...new Set(sectionIds.map((id) => trim(id)).filter(Boolean))];
  if (!ids.length) throw validationError({ sectionId: "required" });
  let next = rows;
  for (const sid of ids) {
    next = upsertReportTemplateAssign(next, sid, tid);
  }
  return next;
}

export function templateForClass(
  assigns: ReportTemplateAssign[],
  sectionIds: string[],
) {
  const ids = sectionIds.map((id) => trim(id)).filter(Boolean);
  const matched = assigns.filter((row) => ids.includes(row.sectionId));
  const bySection = new Map(assigns.map((row) => [row.sectionId, row.templateId]));
  const first = ids[0] ? bySection.get(ids[0]) : "";
  const allSame = Boolean(
    first && ids.every((id) => bySection.get(id) === first),
  );
  return {
    templateId: allSame ? first! : "",
    assigns: matched,
  };
}

function headerIndex(header: string[], ...names: string[]) {
  const lower = header.map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  for (const name of names) {
    const i = lower.indexOf(name);
    if (i >= 0) return i;
  }
  return -1;
}

export type FeeUploadRow = {
  line: number;
  admissionNo: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
};

export function parseFeeUploadRows(text: string): FeeUploadRow[] {
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const header = table[0];
  const admission = headerIndex(header, "admissionno", "admission");
  const invoice = headerIndex(header, "invoiceid", "invoice");
  const amount = headerIndex(header, "amount");
  if (admission < 0 || invoice < 0 || amount < 0) {
    throw validationError({
      file: "CSV needs admissionNo, invoiceId, amount",
    });
  }
  const method = headerIndex(header, "method");
  const paidAt = headerIndex(header, "paidat");
  const methods = new Set(Object.values(PaymentMethod));
  const out: FeeUploadRow[] = [];
  table.slice(1).forEach((cells, i) => {
    const admissionNo = trim(cells[admission]);
    const invoiceId = trim(cells[invoice]);
    const amt = num(cells[amount]);
    if (!admissionNo && !invoiceId) return;
    const rawMethod = method >= 0 ? trim(cells[method]).toUpperCase() : "CASH";
    out.push({
      line: i + 2,
      admissionNo,
      invoiceId,
      amount: amt,
      method: methods.has(rawMethod as PaymentMethod)
        ? (rawMethod as PaymentMethod)
        : PaymentMethod.CASH,
      paidAt: paidAt >= 0 ? trim(cells[paidAt]) : "",
    });
  });
  return out;
}

export type PhotoUploadRow = {
  line: number;
  admissionNo: string;
  scholarNo: string;
  enrollmentNo: string;
  photoUrl: string;
};

export function parsePhotoUploadRows(text: string): PhotoUploadRow[] {
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const header = table[0];
  const admission = headerIndex(header, "admissionno", "admission");
  const scholar = headerIndex(header, "scholarno", "scholarnumber");
  const enrollment = headerIndex(header, "enrollmentno", "enrollmentnumber");
  const photo = headerIndex(header, "photourl", "photo", "url");
  if (photo < 0 || (admission < 0 && scholar < 0 && enrollment < 0)) {
    throw validationError({
      file: "CSV needs photoUrl and admissionNo, scholarNo, or enrollmentNo",
    });
  }
  return table.slice(1).flatMap((cells, i) => {
    const photoUrl = trim(cells[photo]);
    const admissionNo = admission >= 0 ? trim(cells[admission]) : "";
    const scholarNo = scholar >= 0 ? trim(cells[scholar]) : "";
    const enrollmentNo = enrollment >= 0 ? trim(cells[enrollment]) : "";
    if (!photoUrl || (!admissionNo && !scholarNo && !enrollmentNo)) return [];
    return [
      {
        line: i + 2,
        admissionNo,
        scholarNo,
        enrollmentNo,
        photoUrl,
      },
    ];
  });
}

export async function listSiblingGroups(campusId: string) {
  return parseSiblingGroups(await readSetting(campusId, SIBLING_GROUPS_KEY));
}

export async function writeSiblingGroup(campusId: string, studentIds: string[]) {
  const live = await prisma.student.findMany({
    where: { campusId, id: { in: studentIds } },
    select: { id: true },
  });
  if (live.length !== [...new Set(studentIds.filter(Boolean))].length) {
    throw notFound("student");
  }
  const next = mergeSiblingGroup(await listSiblingGroups(campusId), studentIds);
  await writeSetting(campusId, SIBLING_GROUPS_KEY, next);
  return next.find((g) => studentIds.every((id) => g.studentIds.includes(id)))!;
}

export async function siblingsFor(campusId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, campusId },
    select: { id: true },
  });
  if (!student) throw notFound("student");
  const link = siblingsOf(await listSiblingGroups(campusId), studentId);
  if (!link.studentIds.length) return { groupId: link.groupId, siblings: [] };
  const siblings = await prisma.student.findMany({
    where: { campusId, id: { in: link.studentIds } },
    select: {
      id: true,
      admissionNo: true,
      firstName: true,
      lastName: true,
    },
  });
  return { groupId: link.groupId, siblings };
}

export async function listStoreVendors(campusId: string) {
  return parseStoreVendors(await readSetting(campusId, STORE_VENDORS_KEY));
}

export async function saveStoreVendor(
  campusId: string,
  input: { id?: string; name: string },
) {
  const next = upsertStoreVendor(await listStoreVendors(campusId), input);
  await writeSetting(campusId, STORE_VENDORS_KEY, next);
  return next.find((row) => row.name.toLowerCase() === trim(input.name).toLowerCase())!;
}

export async function getStoreVendor(campusId: string, id: string) {
  const row = (await listStoreVendors(campusId)).find((entry) => entry.id === trim(id));
  if (!row) throw notFound("store vendor");
  return row;
}

export async function removeStoreVendor(campusId: string, id: string) {
  const named = await listStoreVendors(campusId);
  const row = named.find((entry) => entry.id === trim(id));
  if (!row) throw notFound("store vendor");
  const next = dropStoreVendor(named, id);
  const catalogRaw = await readSetting(campusId, STORE_CATALOG_KEY);
  await writeSetting(campusId, STORE_VENDORS_KEY, next);
  if (Array.isArray(catalogRaw)) {
    const catalog = dropVendorFromCatalog(parseStoreCatalog(catalogRaw), row.name);
    await writeSetting(campusId, STORE_CATALOG_KEY, catalog);
  }
  return { id: trim(id), deleted: true };
}

export async function listStoreProducts(campusId: string) {
  const [items, catalog] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { campusId },
      include: { stocks: true, category: true },
      orderBy: { name: "asc" },
    }),
    parseStoreCatalog(await readSetting(campusId, STORE_CATALOG_KEY)),
  ]);
  return attachStoreCatalog(items, catalog);
}

export async function createStoreProduct(
  campusId: string,
  input: {
    name: string;
    sku?: string;
    price?: number;
    type?: StoreProductType;
    vendor?: string;
    stock?: number;
    unit?: string;
  },
) {
  const name = trim(input.name);
  if (!name) throw validationError({ name: "required" });
  const item = await prisma.inventoryItem.create({
    data: {
      campusId,
      name,
      unit: trim(input.unit) || "pcs",
    },
  });
  const catalog = upsertStoreCatalog(
    parseStoreCatalog(await readSetting(campusId, STORE_CATALOG_KEY)),
    item.id,
    {
      sku: input.sku,
      price: input.price,
      type: input.type,
      vendor: input.vendor,
    },
  );
  await writeSetting(campusId, STORE_CATALOG_KEY, catalog);
  const vendorName = trim(input.vendor);
  if (vendorName) {
    const vendors = upsertStoreVendor(
      parseStoreVendors(await readSetting(campusId, STORE_VENDORS_KEY)),
      { name: vendorName },
    );
    await writeSetting(campusId, STORE_VENDORS_KEY, vendors);
  }
  const qty = Math.trunc(num(input.stock));
  if (qty > 0) {
    const store = await ensureSchoolStore(campusId);
    await addStock({ campusId, itemId: item.id, storeId: store.id, qty });
  }
  return { ...item, catalog: catalog.find((row) => row.itemId === item.id)! };
}

export async function getStoreProduct(campusId: string, id: string) {
  const itemId = trim(id);
  const row = (await listStoreProducts(campusId)).find((item) => item.id === itemId);
  if (!row) throw notFound("store product");
  return row;
}

export async function patchStoreProduct(
  campusId: string,
  id: string,
  patch: {
    name?: string;
    sku?: string;
    price?: number;
    type?: StoreProductType;
    vendor?: string;
    unit?: string;
  },
) {
  const item = await prisma.inventoryItem.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!item) throw notFound("store product");
  const name = trim(patch.name ?? item.name);
  if (!name) throw validationError({ name: "required" });
  const unit =
    patch.unit !== undefined ? trim(patch.unit) || "pcs" : item.unit;
  await prisma.inventoryItem.update({
    where: { id: item.id },
    data: { name, unit },
  });
  if (
    patch.sku !== undefined ||
    patch.price !== undefined ||
    patch.type !== undefined ||
    patch.vendor !== undefined
  ) {
    const catalog = upsertStoreCatalog(
      parseStoreCatalog(await readSetting(campusId, STORE_CATALOG_KEY)),
      item.id,
      {
        sku: patch.sku,
        price: patch.price,
        type: patch.type,
        vendor: patch.vendor,
      },
    );
    await writeSetting(campusId, STORE_CATALOG_KEY, catalog);
  }
  const vendorName = trim(patch.vendor);
  if (vendorName) {
    const vendors = upsertStoreVendor(
      parseStoreVendors(await readSetting(campusId, STORE_VENDORS_KEY)),
      { name: vendorName },
    );
    await writeSetting(campusId, STORE_VENDORS_KEY, vendors);
  }
  return getStoreProduct(campusId, item.id);
}

export async function removeStoreProduct(campusId: string, id: string) {
  const item = await prisma.inventoryItem.findFirst({
    where: { id: trim(id), campusId },
    select: { id: true, _count: { select: { issues: true } } },
  });
  if (!item) throw notFound("store product");
  if (item._count.issues > 0) throw conflict("product has issues");
  const orders = (await listStoreOrders(campusId)).filter(
    (row) => row.itemId === item.id,
  );
  if (orders.length) throw conflict("product has orders");
  const catalog = dropStoreCatalogItem(
    parseStoreCatalog(await readSetting(campusId, STORE_CATALOG_KEY)),
    item.id,
  );
  await writeSetting(campusId, STORE_CATALOG_KEY, catalog);
  await prisma.itemStock.deleteMany({ where: { itemId: item.id } });
  await prisma.inventoryItem.delete({ where: { id: item.id } });
  return { id: item.id, deleted: true };
}

export async function getKit(campusId: string, id: string) {
  return assertKitProduct(await getStoreProduct(campusId, id));
}

export async function patchKit(
  campusId: string,
  id: string,
  patch: {
    name?: string;
    sku?: string;
    price?: number;
    type?: "kit";
    vendor?: string;
    unit?: string;
  },
) {
  await getKit(campusId, id);
  return assertKitProduct(
    await patchStoreProduct(campusId, id, { ...patch, type: "kit" }),
  );
}

export async function removeKit(campusId: string, id: string) {
  await getKit(campusId, id);
  return removeStoreProduct(campusId, id);
}

async function ensureSchoolStore(campusId: string) {
  const existing = await prisma.itemStore.findFirst({
    where: { campusId, name: "School store" },
  });
  if (existing) return existing;
  return prisma.itemStore.create({ data: { campusId, name: "School store" } });
}

export async function listStoreOrders(campusId: string) {
  return parseStoreOrders(await readSetting(campusId, STORE_ORDERS_KEY));
}

export async function createStoreOrder(
  campusId: string,
  input: {
    studentId: string;
    itemId: string;
    qty: number;
    source?: "staff" | "parent";
  },
) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId },
  });
  if (!student) throw notFound("student");
  const item = await prisma.inventoryItem.findFirst({
    where: { id: input.itemId, campusId },
  });
  if (!item) throw notFound("item");
  const qty = Math.trunc(num(input.qty));
  if (qty < 1) throw validationError({ qty: "must be at least 1" });
  const catalog = parseStoreCatalog(await readSetting(campusId, STORE_CATALOG_KEY));
  const price = catalog.find((row) => row.itemId === item.id)?.price ?? 0;
  const order: StoreOrder = {
    id: crypto.randomUUID(),
    studentId: student.id,
    itemId: item.id,
    qty,
    amount: checkoutAmount(price, qty),
    source: input.source === "parent" ? "parent" : "staff",
    status: "open",
    gatewayOrderId: "",
  };
  const next = [...(await listStoreOrders(campusId)), order];
  await writeSetting(campusId, STORE_ORDERS_KEY, next);
  return order;
}

export async function attachGatewayToStoreOrder(
  campusId: string,
  orderId: string,
  gatewayOrderId: string,
) {
  const next = attachStoreGateway(
    await listStoreOrders(campusId),
    orderId,
    gatewayOrderId,
  );
  await writeSetting(campusId, STORE_ORDERS_KEY, next);
  return next.find((row) => row.id === orderId) ?? null;
}

export async function payStoreOrderByGateway(
  campusId: string,
  gatewayOrderId: string,
) {
  const next = markStorePaidByGateway(
    await listStoreOrders(campusId),
    gatewayOrderId,
  );
  await writeSetting(campusId, STORE_ORDERS_KEY, next);
  return next.find((row) => row.gatewayOrderId === gatewayOrderId) ?? null;
}

export async function parentStoreDesk(campusId: string, studentId: string) {
  const [products, orders] = await Promise.all([
    listStoreProducts(campusId),
    listStoreOrders(campusId),
  ]);
  return {
    products: products.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.catalog?.sku ?? "",
      price: row.catalog?.price ?? 0,
      type: row.catalog?.type ?? "product",
    })),
    orders: orders.filter((row) => row.studentId === studentId),
  };
}

export async function deliverStoreOrder(campusId: string, orderId: string) {
  const orders = await listStoreOrders(campusId);
  const order = orders.find((row) => row.id === orderId);
  if (!order) throw notFound("order");
  if (order.status === "delivered") return order;
  const store = await ensureSchoolStore(campusId);
  await issueStock({
    campusId,
    itemId: order.itemId,
    storeId: store.id,
    qty: order.qty,
    studentId: order.studentId,
  });
  const next = orders.map((row) =>
    row.id === orderId ? { ...row, status: "delivered" as const } : row,
  );
  await writeSetting(campusId, STORE_ORDERS_KEY, next);
  return next.find((row) => row.id === orderId)!;
}

export async function listQuestionnaires(campusId: string) {
  const [forms, extras] = await Promise.all([
    listFeedbackForms(campusId),
    parseQuestionnaires(await readSetting(campusId, QUESTIONNAIRE_KEY)),
  ]);
  const byForm = new Map(extras.map((row) => [row.formId, row]));
  return forms.map((form) => ({
    ...form,
    quiz: byForm.get(form.id) ?? null,
  }));
}

export async function createQuestionnaire(
  campusId: string,
  input: {
    title: string;
    type?: string;
    validFrom?: string;
    validTill?: string;
    questions?: QuizQuestion[];
    classId?: string;
  },
) {
  const title = trim(input.title);
  if (!title) throw validationError({ title: "required" });
  const form = await createFeedbackForm(campusId, title);
  const questions = (input.questions ?? [])
    .map((q) => ({ label: trim(q.label), marks: Math.max(0, num(q.marks)) }))
    .filter((q) => q.label);
  for (const question of questions) {
    await addFeedbackField(campusId, {
      formId: form.id,
      label: question.label,
      kind: FeedbackFieldKind.TEXT,
    });
  }
  const extra: QuestionnaireExtra = {
    formId: form.id,
    type: trim(input.type) || "Quiz",
    validFrom: trim(input.validFrom),
    validTill: trim(input.validTill),
    totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
    questions,
  };
  const extras = [
    ...parseQuestionnaires(await readSetting(campusId, QUESTIONNAIRE_KEY)).filter(
      (row) => row.formId !== form.id,
    ),
    extra,
  ];
  await writeSetting(campusId, QUESTIONNAIRE_KEY, extras);
  if (input.classId && extra.validFrom && extra.validTill) {
    await assignFeedbackForm(campusId, {
      formId: form.id,
      classId: input.classId,
      opensAt: extra.validFrom,
      closesAt: extra.validTill,
    });
  }
  return extra;
}

export async function getQuestionnaire(campusId: string, id: string) {
  const formId = trim(id);
  const row = (await listQuestionnaires(campusId)).find((form) => form.id === formId);
  if (!row) throw notFound("questionnaire");
  return row;
}

export async function patchQuestionnaire(
  campusId: string,
  id: string,
  patch: {
    title?: string;
    type?: string;
    validFrom?: string;
    validTill?: string;
    questions?: QuizQuestion[];
  },
) {
  const form = await prisma.feedbackForm.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!form) throw notFound("questionnaire");
  if (patch.title !== undefined) {
    const title = trim(patch.title);
    if (!title) throw validationError({ title: "required" });
    await prisma.feedbackForm.update({
      where: { id: form.id },
      data: { name: title },
    });
  }
  const extras = parseQuestionnaires(
    await readSetting(campusId, QUESTIONNAIRE_KEY),
  );
  const previous = extras.find((row) => row.formId === form.id);
  const extraPatch =
    patch.type !== undefined ||
    patch.validFrom !== undefined ||
    patch.validTill !== undefined ||
    patch.questions !== undefined;
  if (extraPatch) {
    const questions = (patch.questions ?? previous?.questions ?? [])
      .map((q) => ({ label: trim(q.label), marks: Math.max(0, num(q.marks)) }))
      .filter((q) => q.label);
    const extra: QuestionnaireExtra = {
      formId: form.id,
      type: trim(patch.type ?? previous?.type ?? "Quiz") || "Quiz",
      validFrom:
        patch.validFrom !== undefined
          ? trim(patch.validFrom)
          : (previous?.validFrom ?? ""),
      validTill:
        patch.validTill !== undefined
          ? trim(patch.validTill)
          : (previous?.validTill ?? ""),
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
      questions,
    };
    await writeSetting(campusId, QUESTIONNAIRE_KEY, [
      ...dropQuestionnaireExtra(extras, form.id),
      extra,
    ]);
    if (patch.questions) {
      const existing = await prisma.feedbackField.findMany({
        where: { formId: form.id },
        select: { label: true },
      });
      const known = new Set(existing.map((row) => row.label));
      for (const question of questions) {
        if (known.has(question.label)) continue;
        await addFeedbackField(campusId, {
          formId: form.id,
          label: question.label,
          kind: FeedbackFieldKind.TEXT,
        });
        known.add(question.label);
      }
    }
  }
  return getQuestionnaire(campusId, form.id);
}

export async function removeQuestionnaire(campusId: string, id: string) {
  const form = await prisma.feedbackForm.findFirst({
    where: { id: trim(id), campusId },
    select: { id: true, _count: { select: { responses: true } } },
  });
  if (!form) throw notFound("questionnaire");
  if (form._count.responses > 0) throw conflict("questionnaire has responses");
  const extras = dropQuestionnaireExtra(
    parseQuestionnaires(await readSetting(campusId, QUESTIONNAIRE_KEY)),
    form.id,
  );
  await writeSetting(campusId, QUESTIONNAIRE_KEY, extras);
  await prisma.$transaction([
    prisma.feedbackField.deleteMany({ where: { formId: form.id } }),
    prisma.feedbackAssignment.deleteMany({ where: { formId: form.id } }),
    prisma.feedbackForm.delete({ where: { id: form.id } }),
  ]);
  return { id: form.id, deleted: true };
}

export async function listReportTemplateAssigns(campusId: string) {
  return parseReportTemplateAssigns(
    await readSetting(campusId, REPORT_TEMPLATE_KEY),
  );
}

export async function getReportTemplate(campusId: string, id: string) {
  const row = await prisma.printTemplate.findFirst({
    where: { id, campusId, kind: "MARKSHEET" },
  });
  if (!row) throw notFound("report template");
  return row;
}

export async function patchReportTemplate(
  campusId: string,
  id: string,
  patch: { name?: string; body?: string },
) {
  const existing = await getReportTemplate(campusId, id);
  const name = trim(patch.name ?? existing.name);
  const body = trim(patch.body ?? existing.body);
  if (!name) throw validationError({ name: "required" });
  if (!body) throw validationError({ body: "required" });
  const clash = await prisma.printTemplate.findFirst({
    where: { campusId, kind: "MARKSHEET", name, NOT: { id } },
    select: { id: true },
  });
  if (clash) throw conflict("name already exists");
  return prisma.printTemplate.update({
    where: { id },
    data: { name, body },
  });
}

export async function removeReportTemplate(campusId: string, id: string) {
  await getReportTemplate(campusId, id);
  const assigns = dropReportTemplateAssignsByTemplate(
    await listReportTemplateAssigns(campusId),
    id,
  );
  await writeSetting(campusId, REPORT_TEMPLATE_KEY, assigns);
  await prisma.printTemplate.delete({ where: { id } });
  return { id: trim(id), deleted: true };
}

export async function saveReportTemplate(
  campusId: string,
  input: { name: string; body: string; sectionId?: string },
) {
  if (!trim(input.name) || !trim(input.body)) {
    throw validationError({ name: "required" });
  }
  const template = await upsertPrintTemplate(campusId, {
    kind: "MARKSHEET",
    name: input.name,
    body: input.body,
  });
  if (input.sectionId) {
    const section = await prisma.section.findFirst({
      where: {
        id: input.sectionId,
        class: { program: { department: { campusId } } },
      },
    });
    if (!section) throw notFound("section");
    const next = upsertReportTemplateAssign(
      await listReportTemplateAssigns(campusId),
      section.id,
      template.id,
    );
    await writeSetting(campusId, REPORT_TEMPLATE_KEY, next);
  }
  return template;
}

export async function classPerformanceDesk(campusId: string, classId: string) {
  const klass = await prisma.class.findFirst({
    where: { id: classId, program: { department: { campusId } } },
    include: { sections: { select: { id: true, name: true } } },
  });
  if (!klass) throw notFound("class");
  const assigns = await listReportTemplateAssigns(campusId);
  if (!performanceAssigned(assigns, klass.sections.map((row) => row.id))) {
    return {
      assigned: false,
      message: "Performance report template is not assigned to selected class.",
      className: klass.name,
      students: [] as Array<{
        id: string;
        name: string;
        section: string;
        marks: Array<{ exam: string; subject: string; marks: string; absent: boolean }>;
        coScholastic: Array<{ aspect: string; grade: string; remark: string }>;
      }>,
    };
  }
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classId: klass.id,
      isCurrent: true,
      student: { campusId, status: StudentStatus.ACTIVE },
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      section: { select: { name: true } },
    },
  });
  const marks = await prisma.examMark.findMany({
    where: { studentId: { in: enrollments.map((row) => row.student.id) } },
    include: { examSubject: { include: { exam: { select: { name: true } } } } },
    take: 4000,
  });
  const subjectIds = [...new Set(marks.map((row) => row.examSubject.subjectId))];
  const subjects = subjectIds.length
    ? await prisma.subject.findMany({
        where: { campusId, id: { in: subjectIds } },
        select: { id: true, name: true },
      })
    : [];
  const subjectName = new Map(subjects.map((row) => [row.id, row.name]));
  const byStudent = new Map<string, typeof marks>();
  for (const row of marks) {
    const list = byStudent.get(row.studentId) ?? [];
    list.push(row);
    byStudent.set(row.studentId, list);
  }
  const coRows = await listCoScholastic(campusId);
  const coByStudent = new Map<string, typeof coRows>();
  for (const row of coRows) {
    const list = coByStudent.get(row.studentId) ?? [];
    list.push(row);
    coByStudent.set(row.studentId, list);
  }
  return {
    assigned: true,
    message: "",
    className: klass.name,
    students: enrollments.map((row) => ({
      id: row.student.id,
      name: [row.student.firstName, row.student.lastName].filter(Boolean).join(" "),
      section: row.section.name,
      marks: (byStudent.get(row.student.id) ?? []).map((mark) => ({
        exam: mark.examSubject.exam.name,
        subject:
          subjectName.get(mark.examSubject.subjectId) ?? mark.examSubject.subjectId,
        marks: mark.isAbsent ? "AB" : (mark.marks?.toString() ?? ""),
        absent: mark.isAbsent,
      })),
      coScholastic: (coByStudent.get(row.student.id) ?? []).map((entry) => ({
        aspect: entry.aspect,
        grade: entry.grade,
        remark: entry.remark,
      })),
    })),
  };
}

export async function assignReportTemplate(
  campusId: string,
  input: { sectionId: string; templateId: string },
) {
  const section = await prisma.section.findFirst({
    where: {
      id: input.sectionId,
      class: { program: { department: { campusId } } },
    },
  });
  if (!section) throw notFound("section");
  const template = await prisma.printTemplate.findFirst({
    where: { id: input.templateId, campusId },
  });
  if (!template) throw notFound("template");
  const next = upsertReportTemplateAssign(
    await listReportTemplateAssigns(campusId),
    section.id,
    template.id,
  );
  await writeSetting(campusId, REPORT_TEMPLATE_KEY, next);
  return next.find((row) => row.sectionId === section.id)!;
}

async function classSections(campusId: string, classId: string) {
  const klass = await prisma.class.findFirst({
    where: { id: classId, program: { department: { campusId } } },
    include: { sections: { select: { id: true } } },
  });
  if (!klass) throw notFound("class");
  return klass;
}

export async function classReportTemplate(campusId: string, classId: string) {
  const klass = await classSections(campusId, classId);
  const sectionIds = klass.sections.map((row) => row.id);
  return {
    classId: klass.id,
    ...templateForClass(await listReportTemplateAssigns(campusId), sectionIds),
  };
}

export async function saveClassReportTemplate(
  campusId: string,
  classId: string,
  templateId: string,
) {
  const klass = await classSections(campusId, classId);
  const template = await prisma.printTemplate.findFirst({
    where: { id: templateId, campusId },
  });
  if (!template) throw notFound("template");
  const sectionIds = klass.sections.map((row) => row.id);
  const next = assignTemplateToSections(
    await listReportTemplateAssigns(campusId),
    sectionIds,
    template.id,
  );
  await writeSetting(campusId, REPORT_TEMPLATE_KEY, next);
  return {
    classId: klass.id,
    ...templateForClass(next, sectionIds),
  };
}

export async function applyFeeUpload(
  campusId: string,
  userId: string,
  text: string,
) {
  const rows = parseFeeUploadRows(text);
  const errors: Array<{ line: number; message: string }> = [];
  let paid = 0;
  for (const row of rows) {
    if (!row.admissionNo || !row.invoiceId || row.amount <= 0) {
      errors.push({ line: row.line, message: "missing admission, invoice, or amount" });
      continue;
    }
    const student = await prisma.student.findFirst({
      where: { campusId, admissionNo: row.admissionNo },
      include: {
        enrollments: { where: { isCurrent: true }, take: 1 },
      },
    });
    const enrollmentId = student?.enrollments[0]?.id;
    if (!enrollmentId) {
      errors.push({ line: row.line, message: "student or enrollment not found" });
      continue;
    }
    try {
      await collectPayment({
        campusId,
        userId,
        idempotencyKey: `fee-upload:${campusId}:${row.admissionNo}:${row.invoiceId}:${row.line}`,
        body: {
          enrollmentId,
          invoiceId: row.invoiceId,
          amount: row.amount,
          method: row.method,
          paidAt: row.paidAt || undefined,
        },
      });
      paid += 1;
    } catch (error) {
      errors.push({
        line: row.line,
        message: error instanceof Error ? error.message : "collect failed",
      });
    }
  }
  return { paid, errors, total: rows.length };
}

export async function applyPhotoUpload(campusId: string, text: string) {
  const rows = parsePhotoUploadRows(text);
  const errors: Array<{ line: number; message: string }> = [];
  let updated = 0;
  for (const row of rows) {
    const student = await prisma.student.findFirst({
      where: {
        campusId,
        OR: [
          row.admissionNo ? { admissionNo: row.admissionNo } : undefined,
          row.scholarNo ? { scholarNo: row.scholarNo } : undefined,
          row.enrollmentNo ? { enrollmentNo: row.enrollmentNo } : undefined,
        ].filter(Boolean) as Array<{ admissionNo?: string; scholarNo?: string; enrollmentNo?: string }>,
      },
    });
    if (!student) {
      errors.push({ line: row.line, message: "student not found" });
      continue;
    }
    await prisma.student.update({
      where: { id: student.id },
      data: { photoUrl: row.photoUrl },
    });
    updated += 1;
  }
  return { updated, errors, total: rows.length };
}

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";

export const STAFF_LOANS_KEY = "hr.loans";

export type StaffLoan = {
  id: string;
  staffId: string;
  amount: number;
  balance: number;
  issuedOn: string;
  dueOn?: string;
  note?: string;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

async function readSetting(campusId: string, key: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key } },
  });
  return row?.value;
}

async function writeSetting(
  campusId: string,
  key: string,
  value: Prisma.InputJsonValue,
) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key } },
    update: { value },
    create: { campusId, key, value },
  });
}

export function parseStaffLoans(value: unknown): StaffLoan[] {
  if (!Array.isArray(value)) return [];
  const out: StaffLoan[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const staffId = trim(rec.staffId);
    const amount = money(rec.amount);
    const balance = money(rec.balance);
    if (!id || !staffId || !(amount > 0) || !Number.isFinite(balance) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push({
      id,
      staffId,
      amount,
      balance,
      issuedOn: trim(rec.issuedOn),
      dueOn: trim(rec.dueOn) || undefined,
      note: trim(rec.note) || undefined,
    });
  }
  return out;
}

export function parseStaffLoan(input: unknown): StaffLoan {
  if (!input || typeof input !== "object") {
    throw validationError({ loan: "required" });
  }
  const rec = input as Record<string, unknown>;
  const staffId = trim(rec.staffId);
  const amount = money(rec.amount);
  if (!staffId) throw validationError({ staffId: "required" });
  if (!(amount > 0)) throw validationError({ amount: "must be positive" });
  const issuedOn = trim(rec.issuedOn);
  return {
    id: trim(rec.id) || crypto.randomUUID(),
    staffId,
    amount,
    balance: rec.balance == null ? amount : money(rec.balance),
    issuedOn,
    dueOn: trim(rec.dueOn) || undefined,
    note: trim(rec.note) || undefined,
  };
}

export function upsertStaffLoan(rows: StaffLoan[], loan: StaffLoan) {
  return [...rows.filter((row) => row.id !== loan.id), loan];
}

export function repayStaffLoan(rows: StaffLoan[], loanId: string, amount: unknown) {
  const id = trim(loanId);
  const pay = money(amount);
  const row = rows.find((item) => item.id === id);
  if (!row) throw notFound("loan");
  if (!(pay > 0)) throw validationError({ amount: "must be positive" });
  if (pay > row.balance) throw validationError({ amount: "exceeds balance" });
  return rows.map((item) =>
    item.id === id ? { ...item, balance: Math.round((item.balance - pay) * 100) / 100 } : item,
  );
}

export function attachStaffLoans<T extends { id: string }>(
  staff: T[],
  rows: StaffLoan[],
) {
  const byId = new Map<string, StaffLoan[]>();
  for (const row of rows) {
    const list = byId.get(row.staffId) ?? [];
    list.push(row);
    byId.set(row.staffId, list);
  }
  return staff.map((row) => ({
    ...row,
    loans: byId.get(row.id) ?? [],
  }));
}

export async function listStaffLoans(campusId: string) {
  return parseStaffLoans(await readSetting(campusId, STAFF_LOANS_KEY));
}

export async function saveStaffLoan(campusId: string, input: unknown) {
  const loan = parseStaffLoan(input);
  const staff = await prisma.staff.findFirst({
    where: { id: loan.staffId, campusId },
    select: { id: true },
  });
  if (!staff) throw notFound("staff");
  const next = upsertStaffLoan(await listStaffLoans(campusId), {
    ...loan,
    staffId: staff.id,
  });
  await writeSetting(campusId, STAFF_LOANS_KEY, next);
  return next.find((row) => row.id === loan.id)!;
}

export async function repayCampusStaffLoan(
  campusId: string,
  loanId: string,
  amount: unknown,
) {
  const next = repayStaffLoan(await listStaffLoans(campusId), loanId, amount);
  await writeSetting(campusId, STAFF_LOANS_KEY, next);
  return next.find((row) => row.id === trim(loanId))!;
}

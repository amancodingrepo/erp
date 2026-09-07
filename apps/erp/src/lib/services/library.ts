import { InvoiceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { dec } from "@/lib/money";
import { libraryFine } from "@/lib/library-fine";

async function settingNumber(campusId: string, key: string, fallback: number) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key } },
  });
  const n = Number(row?.value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function chargeLibraryFine(
  campusId: string,
  studentId: string | null,
  amount: Prisma.Decimal,
  description: string,
) {
  if (!studentId || amount.lte(0)) return null;
  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  if (!campus?.currentSessionId) return null;
  let feeType = await prisma.feeType.findFirst({
    where: { campusId, name: "Library" },
  });
  if (!feeType) {
    feeType = await prisma.feeType.create({ data: { campusId, name: "Library" } });
  }
  const invoice = await prisma.feeInvoice.create({
    data: {
      studentId,
      sessionId: campus.currentSessionId,
      status: InvoiceStatus.DUE,
      total: amount,
      lines: {
        create: {
          feeTypeId: feeType.id,
          description,
          amount,
        },
      },
    },
  });
  return invoice.id;
}

export async function createBook(
  campusId: string,
  input: {
    title: string;
    isbn?: string;
    author?: string;
    publisher?: string;
    qty: number;
    rack?: string;
    price?: number | string;
  },
) {
  if (input.qty < 1) throw validationError({ qty: "must be at least 1" });
  return prisma.book.create({
    data: {
      campusId,
      title: input.title.trim(),
      isbn: input.isbn,
      author: input.author,
      publisher: input.publisher,
      qty: input.qty,
      rack: input.rack,
      price: dec(input.price),
    },
  });
}

export async function listBooks(campusId: string) {
  const books = await prisma.book.findMany({
    where: { campusId },
    include: { issues: { where: { returnedAt: null } } },
    orderBy: { title: "asc" },
  });
  return books.map((b) => ({
    id: b.id,
    title: b.title,
    isbn: b.isbn,
    author: b.author,
    qty: b.qty,
    available: Math.max(0, b.qty - b.issues.length),
    rack: b.rack,
    price: b.price.toString(),
  }));
}

async function nextMemberNo(campusId: string) {
  const count = await prisma.libraryMember.count({ where: { campusId } });
  return `LIB-${String(count + 1).padStart(4, "0")}`;
}

export async function addMember(
  campusId: string,
  input: { studentId?: string; staffId?: string },
) {
  if (!input.studentId && !input.staffId) {
    throw validationError({ studentId: "student or staff required" });
  }
  if (input.studentId) {
    const student = await prisma.student.findFirst({
      where: { id: input.studentId, campusId },
    });
    if (!student) throw notFound("student");
    const existing = await prisma.libraryMember.findUnique({
      where: { studentId: student.id },
    });
    if (existing) throw conflict("already a member");
  }
  if (input.staffId) {
    const staff = await prisma.staff.findFirst({
      where: { id: input.staffId, campusId },
    });
    if (!staff) throw notFound("staff");
    const existing = await prisma.libraryMember.findUnique({
      where: { staffId: staff.id },
    });
    if (existing) throw conflict("already a member");
  }
  return prisma.libraryMember.create({
    data: {
      campusId,
      memberNo: await nextMemberNo(campusId),
      studentId: input.studentId,
      staffId: input.staffId,
    },
  });
}

export async function issueBook(
  campusId: string,
  input: { bookId: string; memberId: string },
) {
  const book = await prisma.book.findFirst({
    where: { id: input.bookId, campusId },
    include: { issues: { where: { returnedAt: null } } },
  });
  if (!book) throw notFound("book");
  if (book.issues.length >= book.qty) {
    throw validationError({ bookId: "no copies available" });
  }
  const member = await prisma.libraryMember.findFirst({
    where: { id: input.memberId, campusId },
  });
  if (!member) throw notFound("member");
  const days = await settingNumber(campusId, "library.loanDays", 14);
  const dueOn = new Date();
  dueOn.setUTCDate(dueOn.getUTCDate() + days);
  return prisma.bookIssue.create({
    data: {
      bookId: book.id,
      memberId: member.id,
      dueOn,
    },
  });
}

export async function returnBook(campusId: string, issueId: string) {
  const issue = await prisma.bookIssue.findFirst({
    where: { id: issueId, member: { campusId } },
    include: { member: true, book: true },
  });
  if (!issue) throw notFound("issue");
  if (issue.returnedAt) throw validationError({ returnedAt: "already returned" });
  const perDay = await settingNumber(campusId, "library.finePerDay", 5);
  const returnedAt = new Date();
  const fine = new Prisma.Decimal(libraryFine(issue.dueOn, returnedAt, perDay));
  const updated = await prisma.bookIssue.update({
    where: { id: issue.id },
    data: { returnedAt, fine },
  });
  const invoiceId = await chargeLibraryFine(
    campusId,
    issue.member.studentId,
    fine,
    `Library fine ${issue.book.title}`,
  );
  return { issue: updated, fine: fine.toString(), invoiceId };
}

export async function listOpenIssues(campusId: string) {
  return prisma.bookIssue.findMany({
    where: { returnedAt: null, member: { campusId } },
    include: {
      book: true,
      member: { include: { student: true, staff: true } },
    },
    orderBy: { dueOn: "asc" },
  });
}

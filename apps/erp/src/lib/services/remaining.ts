import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { dec } from "@/lib/money";

export async function redeemCoupon(campusId: string, code: string) {
  const coupon = await prisma.canteenCoupon.findFirst({
    where: { campusId, code: code.trim().toUpperCase() },
  });
  if (!coupon) throw notFound("coupon");
  if (coupon.redeemedAt) throw conflict("coupon already used");
  return prisma.canteenCoupon.update({
    where: { id: coupon.id },
    data: { redeemedAt: new Date() },
  });
}

export async function issueStock(input: {
  campusId: string;
  itemId: string;
  storeId: string;
  qty: number;
  studentId?: string;
  staffId?: string;
}) {
  if (input.qty < 1) throw validationError({ qty: "must be at least 1" });
  const item = await prisma.inventoryItem.findFirst({
    where: { id: input.itemId, campusId: input.campusId },
  });
  if (!item) throw notFound("item");
  const stock = await prisma.itemStock.findUnique({
    where: { itemId_storeId: { itemId: input.itemId, storeId: input.storeId } },
  });
  if (!stock || stock.qty < input.qty) {
    throw validationError({ qty: "not enough stock" });
  }
  await prisma.itemStock.update({
    where: { id: stock.id },
    data: { qty: { decrement: input.qty } },
  });
  return prisma.itemIssue.create({
    data: {
      itemId: input.itemId,
      qty: input.qty,
      studentId: input.studentId,
      staffId: input.staffId,
    },
  });
}

export async function addStock(input: {
  campusId: string;
  itemId: string;
  storeId: string;
  qty: number;
  note?: string;
}) {
  if (input.qty < 1) throw validationError({ qty: "must be at least 1" });
  const item = await prisma.inventoryItem.findFirst({
    where: { id: input.itemId, campusId: input.campusId },
  });
  if (!item) throw notFound("item");
  return prisma.itemStock.upsert({
    where: { itemId_storeId: { itemId: input.itemId, storeId: input.storeId } },
    update: { qty: { increment: input.qty }, note: input.note },
    create: {
      itemId: input.itemId,
      storeId: input.storeId,
      qty: input.qty,
      note: input.note,
    },
  });
}

export async function enrollCourse(input: {
  campusId: string;
  courseId: string;
  studentId: string;
  paid?: boolean;
}) {
  const course = await prisma.lmsCourse.findFirst({
    where: { id: input.courseId, campusId: input.campusId },
  });
  if (!course) throw notFound("course");
  return prisma.lmsEnrollment.upsert({
    where: {
      courseId_studentId: {
        courseId: input.courseId,
        studentId: input.studentId,
      },
    },
    update: { paid: Boolean(input.paid) },
    create: {
      courseId: input.courseId,
      studentId: input.studentId,
      paid: Boolean(input.paid),
    },
  });
}

export async function submitCbt(input: {
  campusId: string;
  examId: string;
  studentId: string;
  answers: Record<string, string>;
}) {
  const exam = await prisma.onlineExamBank.findFirst({
    where: { id: input.examId, campusId: input.campusId },
    include: { questions: true },
  });
  if (!exam) throw notFound("exam");
  let score = new Prisma.Decimal(0);
  for (const q of exam.questions) {
    if (input.answers[q.id] === q.answer) {
      score = score.add(q.marks);
    }
  }
  return prisma.onlineExamAttempt.upsert({
    where: {
      examId_studentId: { examId: input.examId, studentId: input.studentId },
    },
    update: {
      answers: input.answers,
      score,
      submittedAt: new Date(),
    },
    create: {
      examId: input.examId,
      studentId: input.studentId,
      answers: input.answers,
      score,
      submittedAt: new Date(),
    },
  });
}

export async function postChat(input: {
  campusId: string;
  threadId?: string;
  title?: string;
  userId: string;
  body: string;
  studentId?: string;
}) {
  const body = input.body.trim();
  if (!body) throw validationError({ body: "required" });
  let threadId = input.threadId;
  if (!threadId) {
    const thread = await prisma.chatThread.create({
      data: {
        campusId: input.campusId,
        title: (input.title ?? "Desk chat").trim() || "Desk chat",
        studentId: input.studentId,
      },
    });
    threadId = thread.id;
  } else {
    const thread = await prisma.chatThread.findFirst({
      where: { id: threadId, campusId: input.campusId },
    });
    if (!thread) throw notFound("thread");
  }
  const message = await prisma.chatMessage.create({
    data: { threadId, userId: input.userId, body },
  });
  return { threadId, message };
}

export { dec };

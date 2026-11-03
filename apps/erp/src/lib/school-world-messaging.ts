import { randomUUID } from "crypto";
import { prisma } from "./db";
import { HttpError, conflict, forbidden, notFound } from "./errors";
import type { AuthPrincipal } from "./permissions";
import { money } from "./school-world-fees";

const fullName = (row: { firstName?: string | null; lastName?: string | null }) => [row.firstName, row.lastName].filter(Boolean).join(" ");

/**
 * Staff a parent may write to: active staff with an active login, in an active staff category that
 * the school has not blocked for parents (Manage Staff Category > communication settings).
 */
export async function parentContactableStaff(campusId: string) {
  const blocked = await prisma.communicationCategoryRestriction.findMany({ where: { campusId, channel: "parents" }, select: { categoryId: true } });
  const blockedIds = blocked.map((row) => row.categoryId);
  const assignments = await prisma.staffCategoryAssignment.findMany({
    where: { category: { campusId, isActive: true, ...(blockedIds.length ? { id: { notIn: blockedIds } } : {}) } },
    include: { category: true },
  });
  const staff = assignments.length
    ? await prisma.staff.findMany({
        where: { id: { in: assignments.map((a) => a.staffId) }, campusId, isActive: true, user: { isActive: true } },
        include: { user: { select: { id: true } } },
      })
    : [];
  const byId = new Map(staff.map((row) => [row.id, row]));
  return assignments
    .flatMap((a) => {
      const person = byId.get(a.staffId);
      return person?.user ? [{ personId: person.id, userId: person.user.id, fullName: fullName(person) || "Staff member", categoryName: a.category.name }] : [];
    })
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName) || a.fullName.localeCompare(b.fullName));
}

const PARENT_HOURLY_LIMIT = 20;

export async function sendParentMessage(principal: AuthPrincipal, body: Record<string, unknown>) {
  if (principal.actorType !== "GUARDIAN") throw forbidden("Only parent accounts can use Contact Staff.");
  const text = String(body.body ?? "").trim();
  const personId = String(body.recipientPersonId ?? "").trim();
  if (!text) throw new HttpError(400, "validation_error", "Write a message before sending.");
  if (text.length > 10000) throw new HttpError(400, "validation_error", "Messages are limited to 10,000 characters.");
  const recipient = (await parentContactableStaff(principal.campusId)).find((row) => row.personId === personId);
  if (!recipient) throw conflict("That staff member cannot be contacted. Refresh the list and choose again.");
  const recent = await prisma.message.count({ where: { campusId: principal.campusId, senderId: principal.id, sentAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recent >= PARENT_HOURLY_LIMIT) throw new HttpError(429, "rate_limited", "You have sent many messages in the last hour. Please try again later.");
  const children = await prisma.student.findMany({ where: { id: { in: principal.childIds ?? [] }, campusId: principal.campusId }, select: { firstName: true, lastName: true, admissionNo: true } });
  const about = children.map((c) => fullName(c) + " (" + c.admissionNo + ")").join(", ");
  const id = randomUUID();
  await prisma.message.create({
    data: {
      id,
      batchId: id,
      campusId: principal.campusId,
      senderId: principal.id,
      subject: about ? "Message from the parent of " + about : "Message from a parent",
      body: text,
      status: "sent",
      recipients: { create: [{ userId: recipient.userId }] },
    },
  });
  return { ok: true, message: "Your message was sent to " + recipient.fullName + "." };
}

/** Puts a fee reminder in the inbox of each active parent login linked to the student. Nothing is emailed. */
export async function sendFeeReminder(campusId: string, senderId: string, studentCode: string, academicYear: string) {
  const year = String(academicYear || "").trim();
  if (!year) throw new HttpError(400, "validation_error", "Choose an academic year.");
  const student = await prisma.student.findFirst({
    where: { campusId, admissionNo: studentCode },
    include: { guardians: { include: { guardian: { include: { user: { select: { id: true, isActive: true } } } } } } },
  });
  if (!student) throw notFound("Student");
  const lines = await prisma.feeInvoiceLine.findMany({
    where: { invoice: { studentId: student.id, session: { name: year } } },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
  });
  const due = lines
    .map((line) => ({ name: line.description + (line.installmentName ? " (" + line.installmentName + ")" : ""), balance: Math.round((money(line.amount) - money(line.paid)) * 100) / 100, dueDate: line.dueDate }))
    .filter((line) => line.balance > 0);
  if (!due.length) throw conflict("No outstanding fees for " + year + ".");
  const parents = [...new Set(student.guardians.map((g) => g.guardian.user).filter((u): u is { id: string; isActive: boolean } => Boolean(u?.isActive)).map((u) => u.id))];
  if (!parents.length) throw conflict("No active parent login is linked to this student.");
  const total = Math.round(due.reduce((sum, line) => sum + line.balance, 0) * 100) / 100;
  const rupees = (n: number) => "Rs " + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const name = fullName(student);
  const body = [
    "Dear parent,",
    "",
    "This is a reminder that the following fees for " + name + " (" + student.admissionNo + ") are due for " + year + ":",
    ...due.map((line) => "- " + line.name + ": " + rupees(line.balance) + (line.dueDate ? ", due " + line.dueDate.toISOString().slice(0, 10) : "")),
    "",
    "Total due: " + rupees(total),
    "Please ignore this message if you have already paid.",
  ].join("\n");
  const id = randomUUID();
  await prisma.message.create({
    data: {
      id,
      batchId: id,
      campusId,
      senderId,
      subject: "Fee reminder: " + name,
      body,
      status: "sent",
      recipients: { create: parents.map((userId) => ({ userId })) },
    },
  });
  return { ok: true, recipientCount: parents.length, total, message: "Fee reminder sent to " + parents.length + " parent account" + (parents.length === 1 ? "" : "s") + " for " + rupees(total) + "." };
}

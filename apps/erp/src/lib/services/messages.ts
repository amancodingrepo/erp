import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { dec } from "@/lib/money";
import { renderTemplate } from "@/lib/templates";

export async function listTemplates(campusId: string, channel?: string) {
  return prisma.messageTemplate.findMany({
    where: { campusId, ...(channel ? { channel } : {}) },
    orderBy: { name: "asc" },
  });
}

export async function upsertTemplate(
  campusId: string,
  input: { channel: "EMAIL" | "SMS"; name: string; subject?: string; body: string },
) {
  return prisma.messageTemplate.upsert({
    where: {
      campusId_channel_name: {
        campusId,
        channel: input.channel,
        name: input.name.trim(),
      },
    },
    update: { subject: input.subject, body: input.body },
    create: {
      campusId,
      channel: input.channel,
      name: input.name.trim(),
      subject: input.subject,
      body: input.body,
    },
  });
}

export async function listMessageLogs(campusId: string) {
  return prisma.messageLog.findMany({
    where: { campusId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

async function sendSmtp(
  to: string,
  subject: string | null,
  body: string,
  campusId?: string,
) {
  const { loadSmtpConfig } = await import("@/lib/smtp");
  const cfg = await loadSmtpConfig(campusId);
  if (!cfg?.host) return null;
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth:
      cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  await transporter.sendMail({
    from: cfg.from ?? cfg.user ?? "noreply@localhost",
    to,
    subject: subject ?? "Campus ERP",
    text: body,
  });
  return "sent" as const;
}

async function deliver(
  channel: string,
  to: string,
  subject: string | null,
  body: string,
  campusId?: string,
) {
  if (channel === "EMAIL") {
    try {
      const smtp = await sendSmtp(to, subject, body, campusId);
      if (smtp) return smtp;
    } catch {
      return "failed";
    }
  }
  const hook =
    channel === "SMS" ? process.env.SMS_WEBHOOK_URL : process.env.EMAIL_WEBHOOK_URL;
  if (!hook) return "logged";
  const res = await fetch(hook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel, to, subject, body }),
  });
  if (!res.ok) return "failed";
  return "sent";
}

export async function queueRendered(input: {
  campusId: string;
  channel: "EMAIL" | "SMS";
  templateId?: string;
  studentId?: string;
  to: string;
  subject?: string | null;
  body: string;
}) {
  if (!input.to.trim()) {
    throw validationError({ to: "recipient required" });
  }
  const status = await deliver(
    input.channel,
    input.to,
    input.subject ?? null,
    input.body,
    input.campusId,
  );
  return prisma.messageLog.create({
    data: {
      campusId: input.campusId,
      channel: input.channel,
      templateId: input.templateId,
      studentId: input.studentId,
      toAddress: input.to,
      subject: input.subject ?? null,
      body: input.body,
      status,
    },
  });
}

export async function runFeeReminders(
  campusId: string,
  channel: "EMAIL" | "SMS" = "SMS",
) {
  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  if (!campus) throw notFound("campus");
  const template = await prisma.messageTemplate.findFirst({
    where: { campusId, channel, name: "fee_due" },
  });
  if (!template) throw validationError({ template: "fee_due template missing" });
  const invoices = await prisma.feeInvoice.findMany({
    where: {
      status: { in: [InvoiceStatus.DUE, InvoiceStatus.PARTIAL] },
      student: { campusId, status: "ACTIVE" },
    },
    include: { student: true },
  });
  const byStudent = new Map<string, { name: string; admissionNo: string; email: string | null; mobile: string | null; balance: ReturnType<typeof dec> }>();
  for (const inv of invoices) {
    const due = dec(inv.total).minus(inv.paid).minus(inv.discount).plus(inv.fine);
    if (due.lte(0)) continue;
    const cur = byStudent.get(inv.studentId);
    if (cur) {
      cur.balance = cur.balance.plus(due);
    } else {
      byStudent.set(inv.studentId, {
        name: [inv.student.firstName, inv.student.lastName].filter(Boolean).join(" "),
        admissionNo: inv.student.admissionNo,
        email: inv.student.email,
        mobile: inv.student.mobile,
        balance: due,
      });
    }
  }
  const logs = [];
  for (const [studentId, row] of byStudent) {
    const to = channel === "EMAIL" ? row.email : row.mobile;
    if (!to) continue;
    const vars = {
      name: row.name,
      admissionNo: row.admissionNo,
      balance: row.balance.toFixed(2),
      campus: campus.name,
    };
    logs.push(
      await queueRendered({
        campusId,
        channel,
        templateId: template.id,
        studentId,
        to,
        subject: template.subject
          ? renderTemplate(template.subject, vars)
          : "Fee reminder",
        body: renderTemplate(template.body, vars),
      }),
    );
  }
  return { sent: logs.length, skipped: byStudent.size - logs.length };
}

export async function composeToClass(input: {
  campusId: string;
  templateId: string;
  classId?: string;
}) {
  const template = await prisma.messageTemplate.findFirst({
    where: { id: input.templateId, campusId: input.campusId },
  });
  if (!template) throw notFound("template");
  const campus = await prisma.campus.findUnique({ where: { id: input.campusId } });
  const students = await prisma.student.findMany({
    where: {
      campusId: input.campusId,
      status: "ACTIVE",
      ...(input.classId
        ? { enrollments: { some: { classId: input.classId, isCurrent: true } } }
        : {}),
    },
  });
  const channel = template.channel === "EMAIL" ? "EMAIL" : "SMS";
  let sent = 0;
  for (const student of students) {
    const to = channel === "EMAIL" ? student.email : student.mobile;
    if (!to) continue;
    const vars = {
      name: [student.firstName, student.lastName].filter(Boolean).join(" "),
      admissionNo: student.admissionNo,
      campus: campus?.name ?? "",
    };
    await queueRendered({
      campusId: input.campusId,
      channel,
      templateId: template.id,
      studentId: student.id,
      to,
      subject: template.subject ? renderTemplate(template.subject, vars) : null,
      body: renderTemplate(template.body, vars),
    });
    sent += 1;
  }
  return { sent };
}

const PORTAL_LOGIN_BODY =
  "Dear {{name}}, your {{portal}} portal login for {{campus}} is ready.\n\nCampus code: {{campusCode}}\nUsername: {{username}}\nPassword: {{password}}\nAdmission no: {{admissionNo}}\n\nSign in at {{loginUrl}} (choose campus, then Student or Parent).\nThis password is shown only once.";

export async function sendPortalLoginEmail(input: {
  campusId: string;
  studentId: string;
  to: string | null | undefined;
  name: string;
  portal: "student" | "parent";
  username: string;
  password: string;
  admissionNo: string;
  campusName: string;
  campusCode: string;
}) {
  if (!input.to?.trim()) return "skipped";
  let template = await prisma.messageTemplate.findFirst({
    where: {
      campusId: input.campusId,
      channel: "EMAIL",
      name: "portal_login",
    },
  });
  if (!template) {
    template = await prisma.messageTemplate.create({
      data: {
        campusId: input.campusId,
        channel: "EMAIL",
        name: "portal_login",
        subject: "{{campus}} {{portal}} portal login",
        body: PORTAL_LOGIN_BODY,
      },
    });
  }
  const loginUrl =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "https://web-production-99e97.up.railway.app";
  const vars = {
    name: input.name,
    portal: input.portal,
    username: input.username,
    password: input.password,
    admissionNo: input.admissionNo,
    campus: input.campusName,
    campusCode: input.campusCode,
    loginUrl: `${loginUrl.replace(/\/$/, "")}/login`,
  };
  const log = await queueRendered({
    campusId: input.campusId,
    channel: "EMAIL",
    templateId: template.id,
    studentId: input.studentId,
    to: input.to.trim(),
    subject: renderTemplate(template.subject ?? "{{campus}} portal login", vars),
    body: renderTemplate(template.body, vars),
  });
  return log.status;
}

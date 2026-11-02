import { ActorType, Prisma, StudentStatus } from "@prisma/client";
import { parseDateOnly } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { conflict, forbidden, notFound, validationError } from "@/lib/errors";
import type { AuthPrincipal } from "@/lib/permissions";
import {
  listOneWayRoles,
  parentMayMessage,
} from "@/lib/services/campus-branch";
import { allowedMediaUrl } from "@/lib/services/campus-files";

export const REQUEST_CATEGORIES = [
  "Fees",
  "Transport",
  "Academics",
  "Uniforms",
  "Library",
  "Others",
] as const;

export const NOTICE_CHANNELS = [
  "school",
  "teachers",
  "daycare",
  "class",
  "route",
] as const;

export const NOTICE_TYPES = [
  "news",
  "alert",
  "homework_worksheet",
  "homework_assignment",
] as const;

export function isHomeworkType(type: string) {
  return type === "homework_worksheet" || type === "homework_assignment";
}

export function legacyAudienceFromChannel(channelKind: string) {
  if (channelKind === "teachers") return "staff";
  if (channelKind === "class") return "class";
  if (channelKind === "daycare" || channelKind === "route") return "students";
  return "all";
}

export function channelFromAudience(audience: string) {
  if (audience === "staff") return "teachers";
  if (audience === "class") return "class";
  return "school";
}

export function assertNoticeShape(input: {
  channelKind: string;
  type: string;
  classId?: string;
  routeId?: string;
}) {
  if (!NOTICE_CHANNELS.includes(input.channelKind as (typeof NOTICE_CHANNELS)[number])) {
    throw validationError({ channelKind: "invalid" });
  }
  if (!NOTICE_TYPES.includes(input.type as (typeof NOTICE_TYPES)[number])) {
    throw validationError({ type: "invalid" });
  }
  if (isHomeworkType(input.type) && input.channelKind !== "class") {
    throw validationError({ type: "homework only on class channel" });
  }
  if (input.channelKind === "class" && !input.classId) {
    throw validationError({ classId: "required for class channel" });
  }
  if (input.channelKind === "route" && !input.routeId) {
    throw validationError({ routeId: "required for route channel" });
  }
}

export type NoticeChannelKind = (typeof NOTICE_CHANNELS)[number];

export type NoticeChannelRef = {
  id: string;
  kind: NoticeChannelKind;
  classId?: string;
  routeId?: string;
};

export type NoticeChannel = NoticeChannelRef & { name: string };

export function parseChannelId(value: string): NoticeChannelRef {
  const raw = String(value ?? "").trim();
  if (raw === "school" || raw === "teachers" || raw === "daycare") {
    return { id: raw, kind: raw };
  }
  if (raw.startsWith("class:")) {
    const classId = raw.slice(6).trim();
    if (!classId) throw validationError({ channelId: "class required" });
    return { id: `class:${classId}`, kind: "class", classId };
  }
  if (raw.startsWith("route:")) {
    const routeId = raw.slice(6).trim();
    if (!routeId) throw validationError({ channelId: "route required" });
    return { id: `route:${routeId}`, kind: "route", routeId };
  }
  throw validationError({ channelId: "unknown" });
}

export function noticeWhereForChannel(channel: NoticeChannelRef) {
  return {
    channelKind: channel.kind,
    ...(channel.classId ? { classId: channel.classId } : {}),
    ...(channel.routeId ? { routeId: channel.routeId } : {}),
  };
}

export function listNoticeChannelsFromLive(
  classes: Array<{ id: string; name: string }>,
  routes: Array<{ id: string; name: string }>,
): NoticeChannel[] {
  return [
    { id: "school", kind: "school", name: "School" },
    { id: "teachers", kind: "teachers", name: "Teachers" },
    { id: "daycare", kind: "daycare", name: "Daycare" },
    ...classes.map((row) => ({
      id: `class:${row.id}`,
      kind: "class" as const,
      name: row.name,
      classId: row.id,
    })),
    ...routes.map((row) => ({
      id: `route:${row.id}`,
      kind: "route" as const,
      name: row.name,
      routeId: row.id,
    })),
  ];
}

export function composeChannelNotice(channelId: string, value: unknown) {
  const channel = parseChannelId(channelId);
  if (!value || typeof value !== "object") throw validationError({ title: "required" });
  const rec = value as Record<string, unknown>;
  return {
    title: String(rec.title ?? ""),
    body: String(rec.body ?? ""),
    type: rec.type != null ? String(rec.type) : undefined,
    allowReply: rec.allowReply === true,
    hashTag: rec.hashTag != null ? String(rec.hashTag) : undefined,
    publishAt: rec.publishAt != null ? String(rec.publishAt) : undefined,
    isPublished: rec.isPublished === true,
    attachmentUrl: rec.attachmentUrl != null ? String(rec.attachmentUrl) : undefined,
    attachmentName: rec.attachmentName != null ? String(rec.attachmentName) : undefined,
    channelKind: channel.kind,
    classId: channel.classId,
    routeId: channel.routeId,
  };
}

export async function listNoticeChannels(campusId: string) {
  const [classes, routes] = await Promise.all([
    prisma.class.findMany({
      where: { isActive: true, program: { department: { campusId } } },
      select: { id: true, name: true },
      orderBy: [{ sequenceNo: "asc" }, { name: "asc" }],
    }),
    prisma.transportRoute.findMany({
      where: { campusId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return listNoticeChannelsFromLive(classes, routes);
}

export async function assertChannelInCampus(campusId: string, channelId: string) {
  const channel = parseChannelId(channelId);
  if (channel.kind === "class" && channel.classId) {
    const klass = await prisma.class.findFirst({
      where: { id: channel.classId, program: { department: { campusId } } },
      select: { id: true },
    });
    if (!klass) throw notFound("class");
  }
  if (channel.kind === "route" && channel.routeId) {
    const route = await prisma.transportRoute.findFirst({
      where: { id: channel.routeId, campusId },
      select: { id: true },
    });
    if (!route) throw notFound("route");
  }
  return channel;
}

export function normalizeNoticeInput(input: {
  title: string;
  body: string;
  audience?: string;
  channelKind?: string;
  type?: string;
  allowReply?: boolean;
  hashTag?: string;
  classId?: string;
  routeId?: string;
  publishAt?: string;
  isPublished?: boolean;
}) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) throw validationError({ title: "required" });
  if (!body) throw validationError({ body: "required" });
  const channelKind =
    input.channelKind ?? channelFromAudience(input.audience ?? "all");
  const type = input.type ?? "news";
  assertNoticeShape({
    channelKind,
    type,
    classId: input.classId,
    routeId: input.routeId,
  });
  return {
    title,
    body,
    audience: input.audience ?? legacyAudienceFromChannel(channelKind),
    channelKind,
    type,
    allowReply: input.allowReply ?? false,
    hashTag: input.hashTag,
    classId: input.classId,
    routeId: input.routeId,
    publishAt: input.publishAt ? new Date(input.publishAt) : undefined,
    isPublished: input.isPublished === true,
  };
}

export function noticeListFilter(status: string | null | undefined) {
  if (status === "pending") return { isPublished: false };
  if (status === "all") return {};
  return { isPublished: true };
}

export function noticePublishState(isPublished: boolean) {
  return isPublished ? "published" : "pending";
}

export const NOTICE_ATTACHMENTS_KEY = "comms.noticeAttachments";

export type NoticeAttachment = {
  id: string;
  noticeId: string;
  name: string;
  url: string;
};

function trimText(value: unknown) {
  return String(value ?? "").trim();
}



export function parseNoticeAttachments(value: unknown): NoticeAttachment[] {
  if (!Array.isArray(value)) return [];
  const out: NoticeAttachment[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trimText(rec.id);
    const noticeId = trimText(rec.noticeId);
    const name = trimText(rec.name);
    const url = allowedMediaUrl(rec.url);
    if (!id || !noticeId || !name || !url || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, noticeId, name, url });
  }
  return out;
}

export function upsertNoticeAttachment(
  rows: NoticeAttachment[],
  input: { id?: string; noticeId: string; name: string; url: string },
) {
  const noticeId = trimText(input.noticeId);
  const name = trimText(input.name);
  const url = allowedMediaUrl(input.url);
  if (!noticeId) throw validationError({ noticeId: "required" });
  if (!name) throw validationError({ name: "required" });
  if (!url) throw validationError({ url: "https or hosted file required" });
  const id = trimText(input.id) || crypto.randomUUID();
  const next: NoticeAttachment = { id, noticeId, name, url };
  return [...rows.filter((row) => row.id !== id), next];
}

export function attachNoticeMedia<T extends { id: string }>(
  notices: T[],
  attachments: NoticeAttachment[],
) {
  const byNotice = new Map<string, NoticeAttachment[]>();
  for (const row of attachments) {
    const list = byNotice.get(row.noticeId) ?? [];
    list.push(row);
    byNotice.set(row.noticeId, list);
  }
  return notices.map((row) => ({
    ...row,
    attachments: byNotice.get(row.id) ?? [],
  }));
}

export const NOTICE_REPLIES_KEY = "comms.noticeReplies";

export type NoticeReply = {
  id: string;
  noticeId: string;
  body: string;
  authorRole: "parent" | "staff";
  studentId?: string;
  at: string;
};

export function assertParentMayReply(allowReply: boolean) {
  if (!allowReply) throw forbidden("replies disabled");
}

function noticeAuthorRole(value: unknown): "parent" | "staff" | "" {
  const role = trimText(value);
  if (role === "parent" || role === "staff") return role;
  return "";
}

export function parseNoticeReplies(value: unknown): NoticeReply[] {
  if (!Array.isArray(value)) return [];
  const out: NoticeReply[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trimText(rec.id);
    const noticeId = trimText(rec.noticeId);
    const body = trimText(rec.body);
    const authorRole = noticeAuthorRole(rec.authorRole);
    if (!id || !noticeId || !body || !authorRole || seen.has(id)) continue;
    seen.add(id);
    const studentId = trimText(rec.studentId);
    out.push({
      id,
      noticeId,
      body,
      authorRole,
      ...(studentId ? { studentId } : {}),
      at: trimText(rec.at) || new Date(0).toISOString(),
    });
  }
  return out;
}

export function upsertNoticeReply(
  rows: NoticeReply[],
  input: {
    id?: string;
    noticeId: string;
    body: string;
    authorRole: string;
    studentId?: string;
    at?: string;
  },
) {
  const noticeId = trimText(input.noticeId);
  const body = trimText(input.body);
  const authorRole = noticeAuthorRole(input.authorRole);
  if (!noticeId) throw validationError({ noticeId: "required" });
  if (!body) throw validationError({ body: "required" });
  if (!authorRole) throw validationError({ authorRole: "invalid" });
  const id = trimText(input.id) || crypto.randomUUID();
  const studentId = trimText(input.studentId);
  const next: NoticeReply = {
    id,
    noticeId,
    body,
    authorRole,
    ...(studentId ? { studentId } : {}),
    at: trimText(input.at) || new Date().toISOString(),
  };
  return [...rows.filter((row) => row.id !== id), next];
}

export function attachNoticeReplies<T extends { id: string }>(
  notices: T[],
  replies: NoticeReply[],
) {
  const byNotice = new Map<string, NoticeReply[]>();
  for (const row of replies) {
    const list = byNotice.get(row.noticeId) ?? [];
    list.push(row);
    byNotice.set(row.noticeId, list);
  }
  return notices.map((row) => ({
    ...row,
    replies: (byNotice.get(row.id) ?? []).sort((a, b) => (a.at < b.at ? -1 : 1)),
  }));
}

export function notViewedStudents<T extends { id: string }>(
  expected: T[],
  readStudentIds: Array<string | null | undefined>,
) {
  const read = new Set(readStudentIds.filter((id): id is string => Boolean(id)));
  return expected.filter((row) => !read.has(row.id));
}

export function threadRootId(row: { id: string; threadId: string | null }) {
  return row.threadId ?? row.id;
}

export function requestCreatedAtFilter(fromDate?: string, toDate?: string) {
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (fromDate) {
    const start = new Date(fromDate);
    if (Number.isNaN(start.getTime())) throw validationError({ fromDate: "invalid" });
    createdAt.gte = start;
  }
  if (toDate) {
    const end = new Date(toDate);
    if (Number.isNaN(end.getTime())) throw validationError({ toDate: "invalid" });
    if (!toDate.includes("T")) end.setHours(23, 59, 59, 999);
    createdAt.lte = end;
  }
  return Object.keys(createdAt).length ? createdAt : undefined;
}

export type RequestFolder = "inbox" | "sent" | "scheduled" | "unseen";

async function studentInCampus(campusId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, campusId },
  });
  if (!student) throw notFound("student");
  return student;
}

export async function upsertDaycare(
  campusId: string,
  studentId: string,
  input: {
    enrolled: boolean;
    checkIn?: string | null;
    checkOut?: string | null;
    allowCctv?: boolean;
  },
) {
  await studentInCampus(campusId, studentId);
  return prisma.studentDaycare.upsert({
    where: { studentId },
    update: {
      enrolled: input.enrolled,
      checkIn: input.checkIn ?? null,
      checkOut: input.checkOut ?? null,
      allowCctv: input.allowCctv ?? false,
    },
    create: {
      studentId,
      enrolled: input.enrolled,
      checkIn: input.checkIn ?? null,
      checkOut: input.checkOut ?? null,
      allowCctv: input.allowCctv ?? false,
    },
  });
}

export async function addImmunization(
  campusId: string,
  studentId: string,
  input: {
    vaccineName: string;
    scheduleDate?: string;
    administeredDate?: string;
    remarks?: string;
    status?: string;
    imageUrl?: string;
  },
) {
  await studentInCampus(campusId, studentId);
  const name = input.vaccineName.trim();
  if (!name) throw validationError({ vaccineName: "required" });
  const status = (input.status ?? "SCHEDULED").toUpperCase();
  if (!["SCHEDULED", "ADMINISTERED", "MISSED"].includes(status)) {
    throw validationError({ status: "invalid" });
  }
  return prisma.immunizationRecord.create({
    data: {
      campusId,
      studentId,
      vaccineName: name,
      scheduleDate: input.scheduleDate ? parseDateOnly(input.scheduleDate) : null,
      administeredDate: input.administeredDate
        ? parseDateOnly(input.administeredDate)
        : null,
      remarks: input.remarks,
      status,
      imageUrl: input.imageUrl,
    },
  });
}

export function feeLedgerFromInvoices(
  invoices: Array<{
    id: string;
    status: string;
    total: { toString(): string } | number;
    paid: { toString(): string } | number;
    discount: { toString(): string } | number;
    fine: { toString(): string } | number;
    createdAt: Date;
    lines: Array<{
      id: string;
      description: string;
      amount: { toString(): string } | number;
      paid: { toString(): string } | number;
      discount: { toString(): string } | number;
      fine: { toString(): string } | number;
      dueDate: Date | null;
      feeType?: { name: string } | null;
    }>;
    payments: Array<{ paidAt: Date }>;
    master?: { group?: { name: string } | null } | null;
  }>,
) {
  const totalFees = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.paid), 0);
  const totalDiscount = invoices.reduce((sum, inv) => sum + Number(inv.discount), 0);
  const totalFine = invoices.reduce((sum, inv) => sum + Number(inv.fine), 0);
  const totalUnpaid = totalFees - totalPaid - totalDiscount + totalFine;
  const installments = invoices.flatMap((inv) => {
    if (!inv.lines.length) {
      return [
        {
          id: inv.id,
          name: inv.master?.group?.name ?? "Fees",
          feeTypes: [],
          subAmount: Number(inv.total),
          discount: Number(inv.discount),
          lateFee: Number(inv.fine),
          totalAmount: Number(inv.total) - Number(inv.discount) + Number(inv.fine),
          paidAmount: Number(inv.paid),
          notes: null as string | null,
          dueDate: null as Date | null,
          status: inv.status === "PAID" ? "Paid" : "Unpaid",
          paidDate: inv.payments[0]?.paidAt ?? null,
        },
      ];
    }
    return inv.lines.map((line) => {
      const sub = Number(line.amount);
      const discount = Number(line.discount);
      const lateFee = Number(line.fine);
      const paidAmount = Number(line.paid);
      const totalAmount = sub - discount + lateFee;
      return {
        id: line.id,
        name: line.description || inv.master?.group?.name || "Fees",
        feeTypes: line.feeType?.name ? [line.feeType.name] : [],
        subAmount: sub,
        discount,
        lateFee,
        totalAmount,
        paidAmount,
        notes: null as string | null,
        dueDate: line.dueDate,
        status: paidAmount >= totalAmount && totalAmount > 0 ? "Paid" : "Unpaid",
        paidDate: inv.payments[0]?.paidAt ?? null,
      };
    });
  });
  return {
    totalFees: totalFees.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    totalUnpaid: totalUnpaid.toFixed(2),
    installments,
  };
}

async function deliverDue(campusId: string) {
  await prisma.parentRequest.updateMany({
    where: {
      campusId,
      deliveredAt: null,
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
    },
    data: { deliveredAt: new Date() },
  });
}

function isStaff(user: AuthPrincipal) {
  return user.actorType === ActorType.STAFF;
}

export async function composeRequest(
  user: AuthPrincipal,
  input: {
    body: string;
    studentId?: string;
    recipientUserId?: string;
    classId?: string;
    category?: string;
    hashTag?: string;
    attachmentUrl?: string;
    scheduledAt?: string;
  },
) {
  const body = input.body.trim();
  if (!body) throw validationError({ body: "required" });
  const category = input.category?.trim() || "Others";
  if (!REQUEST_CATEGORIES.includes(category as (typeof REQUEST_CATEGORIES)[number])) {
    throw validationError({ category: "invalid" });
  }
  if (input.studentId) {
    await studentInCampus(user.campusId, input.studentId);
    if (!isStaff(user)) {
      const allowed =
        user.studentId === input.studentId ||
        user.childIds?.includes(input.studentId);
      if (!allowed) throw forbidden("forbidden");
    }
  } else if (!isStaff(user)) {
    const childId = user.studentId ?? user.childIds?.[0];
    if (!childId) throw validationError({ studentId: "required" });
    input.studentId = childId;
  }
  if (input.recipientUserId) {
    const recipient = await prisma.user.findFirst({
      where: { id: input.recipientUserId, campusId: user.campusId },
      include: { roles: { include: { role: true } } },
    });
    if (!recipient) throw notFound("recipient");
    if (!isStaff(user)) {
      const blocked = await listOneWayRoles(user.campusId);
      if (
        !parentMayMessage(
          blocked,
          recipient.roles.map((row) => row.role.name),
        )
      ) {
        throw forbidden("one-way communication");
      }
    }
  }
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    throw validationError({ scheduledAt: "invalid" });
  }
  const deliverNow = !scheduledAt || scheduledAt.getTime() <= Date.now();
  return prisma.parentRequest.create({
    data: {
      campusId: user.campusId,
      authorUserId: user.id,
      studentId: input.studentId,
      recipientUserId: input.recipientUserId,
      classId: input.classId,
      body,
      category,
      hashTag: input.hashTag,
      attachmentUrl: input.attachmentUrl,
      scheduledAt,
      deliveredAt: deliverNow ? new Date() : null,
    },
  });
}

async function childClassIds(user: AuthPrincipal) {
  const ids = user.childIds?.length
    ? user.childIds
    : user.studentId
      ? [user.studentId]
      : [];
  if (!ids.length) return [];
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { studentId: { in: ids }, isCurrent: true },
    select: { classId: true },
  });
  return enrollments.map((e) => e.classId);
}

export async function listRequests(
  user: AuthPrincipal,
  folder: RequestFolder,
  filters?: {
    category?: string;
    status?: string;
    q?: string;
    classId?: string;
    firstName?: string;
    lastName?: string;
    fromDate?: string;
    toDate?: string;
  },
) {
  await deliverDue(user.campusId);
  const childIds =
    user.actorType === ActorType.STUDENT
      ? user.studentId
        ? [user.studentId]
        : []
      : user.actorType === ActorType.GUARDIAN
        ? (user.childIds ?? [])
        : null;
  const classIds = isStaff(user) ? [] : await childClassIds(user);
  const createdAt = requestCreatedAtFilter(filters?.fromDate, filters?.toDate);
  const studentName =
    filters?.firstName || filters?.lastName
      ? {
          student: {
            is: {
              ...(filters.firstName
                ? {
                    firstName: {
                      contains: filters.firstName,
                      mode: "insensitive" as const,
                    },
                  }
                : {}),
              ...(filters.lastName
                ? {
                    lastName: {
                      contains: filters.lastName,
                      mode: "insensitive" as const,
                    },
                  }
                : {}),
            },
          },
        }
      : {};

  const base = {
    campusId: user.campusId,
    ...(filters?.category ? { category: filters.category } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.classId ? { classId: filters.classId } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...studentName,
    ...(filters?.q
      ? {
          OR: [
            { body: { contains: filters.q, mode: "insensitive" as const } },
            { hashTag: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  let extra;
  if (folder === "sent") {
    extra = { authorUserId: user.id };
  } else if (folder === "scheduled") {
    extra = {
      authorUserId: user.id,
      deliveredAt: null,
      scheduledAt: { gt: new Date() },
    };
  } else {
    const audience = isStaff(user)
      ? {
          OR: [
            { recipientUserId: user.id },
            { recipientUserId: null, authorUserId: { not: user.id } },
          ],
        }
      : {
          OR: [
            { recipientUserId: user.id },
            ...(childIds?.length
              ? [{ recipientUserId: null, studentId: { in: childIds } }]
              : []),
            ...(classIds.length
              ? [{ recipientUserId: null, studentId: null, classId: { in: classIds } }]
              : []),
          ],
        };
    extra = {
      AND: [
        { authorUserId: { not: user.id } },
        { deliveredAt: { not: null } },
        audience,
      ],
    };
  }
  const where = { AND: [base, extra] };

  const rows = await prisma.parentRequest.findMany({
    where,
    include: {
      author: { select: { id: true, username: true, actorType: true } },
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
      reads: { where: { userId: user.id } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const mapped = rows.map((row) => ({
    id: row.id,
    body: row.body,
    category: row.category,
    status: row.status,
    hashTag: row.hashTag,
    threadId: row.threadId ?? row.id,
    scheduledAt: row.scheduledAt,
    deliveredAt: row.deliveredAt,
    createdAt: row.createdAt,
    student: row.student,
    author: row.author,
    unread: row.reads.length === 0 && row.authorUserId !== user.id,
  }));
  if (folder === "unseen") {
    return mapped.filter((row) => row.unread);
  }
  return mapped;
}

export async function markRequestRead(user: AuthPrincipal, requestId: string) {
  await deliverDue(user.campusId);
  const row = await prisma.parentRequest.findFirst({
    where: { id: requestId, campusId: user.campusId },
  });
  if (!row) throw notFound("request");
  await prisma.parentRequestRead.upsert({
    where: { requestId_userId: { requestId, userId: user.id } },
    update: { readAt: new Date() },
    create: { requestId, userId: user.id },
  });
  return { id: requestId, read: true };
}

export async function closeRequest(user: AuthPrincipal, requestId: string) {
  const row = await prisma.parentRequest.findFirst({
    where: { id: requestId, campusId: user.campusId },
  });
  if (!row) throw notFound("request");
  if (!isStaff(user) && row.authorUserId !== user.id) {
    throw forbidden("forbidden");
  }
  return prisma.parentRequest.update({
    where: { id: requestId },
    data: { status: "CLOSED" },
  });
}

export async function reopenRequest(user: AuthPrincipal, requestId: string) {
  const row = await prisma.parentRequest.findFirst({
    where: { id: requestId, campusId: user.campusId },
  });
  if (!row) throw notFound("request");
  if (!isStaff(user) && row.authorUserId !== user.id) {
    throw forbidden("forbidden");
  }
  if (row.status !== "CLOSED") throw conflict("not closed");
  return prisma.parentRequest.update({
    where: { id: requestId },
    data: { status: "OPEN" },
  });
}

export async function replyRequest(
  user: AuthPrincipal,
  requestId: string,
  body: string,
) {
  const text = body.trim();
  if (!text) throw validationError({ body: "required" });
  const parent = await prisma.parentRequest.findFirst({
    where: { id: requestId, campusId: user.campusId },
  });
  if (!parent) throw notFound("request");
  if (!isStaff(user)) {
    const allowed =
      parent.authorUserId === user.id ||
      parent.recipientUserId === user.id ||
      (parent.studentId &&
        (user.studentId === parent.studentId ||
          user.childIds?.includes(parent.studentId)));
    if (!allowed) throw forbidden("forbidden");
  }
  return prisma.parentRequest.create({
    data: {
      campusId: user.campusId,
      authorUserId: user.id,
      studentId: parent.studentId,
      recipientUserId:
        parent.authorUserId === user.id
          ? parent.recipientUserId
          : parent.authorUserId,
      classId: parent.classId,
      threadId: threadRootId(parent),
      body: text,
      category: parent.category,
      hashTag: parent.hashTag,
      deliveredAt: new Date(),
    },
  });
}

export async function markNoticeRead(
  user: AuthPrincipal,
  noticeId: string,
  studentId?: string,
) {
  const notice = await prisma.notice.findFirst({
    where: { id: noticeId, campusId: user.campusId, isPublished: true },
  });
  if (!notice) throw notFound("notice");
  const linked =
    studentId &&
    (user.studentId === studentId || user.childIds?.includes(studentId))
      ? studentId
      : (user.studentId ?? user.childIds?.[0] ?? null);
  await prisma.noticeRead.upsert({
    where: { noticeId_userId: { noticeId, userId: user.id } },
    update: { readAt: new Date(), studentId: linked },
    create: { noticeId, userId: user.id, studentId: linked },
  });
  return { id: noticeId, read: true };
}

export async function noticeReceipts(campusId: string, noticeId: string) {
  const notice = await prisma.notice.findFirst({
    where: { id: noticeId, campusId },
  });
  if (!notice) throw notFound("notice");
  const reads = await prisma.noticeRead.findMany({
    where: { noticeId },
    orderBy: { readAt: "desc" },
  });
  return {
    noticeId,
    title: notice.title,
    readCount: reads.length,
    reads,
  };
}

export function toNoticeReads(receipts: {
  noticeId: string;
  title: string;
  readCount: number;
  reads: unknown[];
}) {
  return {
    noticeId: receipts.noticeId,
    title: receipts.title,
    readCount: receipts.readCount,
    read_count: receipts.readCount,
    reads: receipts.reads,
  };
}

export async function noticeReads(campusId: string, noticeId: string) {
  return toNoticeReads(await noticeReceipts(campusId, noticeId));
}

export async function createNotice(
  campusId: string,
  input: Parameters<typeof normalizeNoticeInput>[0],
) {
  const data = normalizeNoticeInput(input);
  return prisma.notice.create({
    data: {
      campusId,
      title: data.title,
      body: data.body,
      audience: data.audience,
      channelKind: data.channelKind,
      type: data.type,
      allowReply: data.allowReply,
      hashTag: data.hashTag,
      classId: data.classId,
      routeId: data.routeId,
      publishAt: data.publishAt,
      isPublished: data.isPublished,
    },
  });
}

export async function approveNotice(campusId: string, noticeId: string) {
  const notice = await prisma.notice.findFirst({
    where: { id: noticeId, campusId },
  });
  if (!notice) throw notFound("notice");
  if (notice.isPublished) return notice;
  return prisma.notice.update({
    where: { id: notice.id },
    data: { isPublished: true, publishAt: new Date() },
  });
}

async function readNoticeSetting(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: NOTICE_ATTACHMENTS_KEY } },
  });
  return parseNoticeAttachments(row?.value);
}

async function writeNoticeSetting(campusId: string, value: NoticeAttachment[]) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: NOTICE_ATTACHMENTS_KEY } },
    update: { value: value as Prisma.InputJsonValue },
    create: {
      campusId,
      key: NOTICE_ATTACHMENTS_KEY,
      value: value as Prisma.InputJsonValue,
    },
  });
}

export async function listNoticeAttachments(campusId: string) {
  return readNoticeSetting(campusId);
}

export async function saveNoticeAttachment(
  campusId: string,
  input: { id?: string; noticeId: string; name: string; url: string },
) {
  const notice = await prisma.notice.findFirst({
    where: { id: input.noticeId, campusId },
    select: { id: true },
  });
  if (!notice) throw notFound("notice");
  const next = upsertNoticeAttachment(await readNoticeSetting(campusId), {
    ...input,
    noticeId: notice.id,
  });
  await writeNoticeSetting(campusId, next);
  return next.find((row) => row.noticeId === notice.id && row.name === trimText(input.name))!;
}

async function readNoticeRepliesSetting(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: NOTICE_REPLIES_KEY } },
  });
  return parseNoticeReplies(row?.value);
}

async function writeNoticeRepliesSetting(campusId: string, value: NoticeReply[]) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: NOTICE_REPLIES_KEY } },
    update: { value: value as Prisma.InputJsonValue },
    create: {
      campusId,
      key: NOTICE_REPLIES_KEY,
      value: value as Prisma.InputJsonValue,
    },
  });
}

export async function listNoticeReplies(campusId: string, noticeId?: string) {
  const rows = await readNoticeRepliesSetting(campusId);
  const id = trimText(noticeId);
  return id ? rows.filter((row) => row.noticeId === id) : rows;
}

export async function saveNoticeReply(
  campusId: string,
  input: {
    noticeId: string;
    body: string;
    authorRole: "parent" | "staff";
    studentId?: string;
  },
) {
  const notice = await prisma.notice.findFirst({
    where: { id: input.noticeId, campusId },
    select: { id: true, allowReply: true, isPublished: true },
  });
  if (!notice) throw notFound("notice");
  if (input.authorRole === "parent") {
    if (!notice.isPublished) throw forbidden("unpublished");
    assertParentMayReply(notice.allowReply);
  }
  const next = upsertNoticeReply(await readNoticeRepliesSetting(campusId), {
    ...input,
    noticeId: notice.id,
  });
  await writeNoticeRepliesSetting(campusId, next);
  return (
    next.find(
      (row) =>
        row.noticeId === notice.id &&
        row.body === trimText(input.body) &&
        row.authorRole === input.authorRole,
    ) ?? next[next.length - 1]!
  );
}

export async function deleteNotice(campusId: string, noticeId: string) {
  const notice = await prisma.notice.findFirst({
    where: { id: noticeId, campusId },
    select: { id: true },
  });
  if (!notice) throw notFound("notice");
  await prisma.notice.delete({ where: { id: notice.id } });
  await writeNoticeSetting(
    campusId,
    (await readNoticeSetting(campusId)).filter((row) => row.noticeId !== notice.id),
  );
  await writeNoticeRepliesSetting(
    campusId,
    (await readNoticeRepliesSetting(campusId)).filter(
      (row) => row.noticeId !== notice.id,
    ),
  );
  return { id: notice.id, deleted: true };
}

const studentNameSelect = {
  id: true,
  firstName: true,
  lastName: true,
  admissionNo: true,
} as const;

async function expectedNoticeStudents(
  campusId: string,
  notice: {
    channelKind: string;
    classId: string | null;
    routeId: string | null;
  },
) {
  if (notice.channelKind === "teachers") return [];
  if (notice.channelKind === "class" && notice.classId) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        classId: notice.classId,
        isCurrent: true,
        student: { campusId, status: StudentStatus.ACTIVE },
      },
      include: { student: { select: studentNameSelect } },
    });
    return enrollments.map((row) => row.student);
  }
  if (notice.channelKind === "daycare") {
    const rows = await prisma.studentDaycare.findMany({
      where: { enrolled: true, student: { campusId } },
      include: { student: { select: studentNameSelect } },
    });
    return rows.map((row) => row.student);
  }
  if (notice.channelKind === "route" && notice.routeId) {
    const rows = await prisma.studentTransport.findMany({
      where: {
        student: { campusId },
        OR: [{ routeId: notice.routeId }, { outRouteId: notice.routeId }],
      },
      include: { student: { select: studentNameSelect } },
    });
    return rows.map((row) => row.student);
  }
  return prisma.student.findMany({
    where: { campusId, status: StudentStatus.ACTIVE },
    select: studentNameSelect,
    take: 5000,
  });
}

export async function noticeNotViewed(campusId: string, noticeId: string) {
  const notice = await prisma.notice.findFirst({
    where: { id: noticeId, campusId },
  });
  if (!notice) throw notFound("notice");
  const expected = await expectedNoticeStudents(campusId, notice);
  const reads = await prisma.noticeRead.findMany({ where: { noticeId } });
  const students = notViewedStudents(
    expected,
    reads.map((row) => row.studentId),
  );
  return {
    noticeId,
    expectedCount: expected.length,
    notViewedCount: students.length,
    students,
  };
}

export async function listHouses(campusId: string) {
  return prisma.house.findMany({
    where: { campusId },
    orderBy: { name: "asc" },
  });
}

export async function createHouse(campusId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw validationError({ name: "required" });
  return prisma.house.create({ data: { campusId, name: trimmed } });
}

export function houseIdOrNull(raw: string | null | undefined) {
  if (raw == null || raw === "" || raw === "none") return null;
  return raw;
}

export async function assertHouseInCampus(campusId: string, houseId: string) {
  const house = await prisma.house.findFirst({
    where: { id: houseId, campusId },
  });
  if (!house) throw notFound("house");
  return house;
}

export async function changeHouse(
  campusId: string,
  studentIds: string[],
  houseId: string | null,
) {
  if (!studentIds.length) throw validationError({ studentIds: "required" });
  if (houseId) await assertHouseInCampus(campusId, houseId);
  const result = await prisma.student.updateMany({
    where: { campusId, id: { in: studentIds } },
    data: { houseId },
  });
  return { updated: result.count, houseId };
}

export function eventMatchesQuery(
  event: { startsAt: Date | string; classId?: string | null },
  query: { from?: string; to?: string; classId?: string | null },
) {
  const at = new Date(event.startsAt).getTime();
  if (Number.isNaN(at)) return false;
  if (query.from) {
    const from = new Date(query.from).getTime();
    if (!Number.isNaN(from) && at < from) return false;
  }
  if (query.to) {
    const raw = String(query.to).trim();
    const to = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59.999Z` : raw);
    if (!Number.isNaN(to.getTime()) && at > to.getTime()) return false;
  }
  if (query.classId === undefined) return true;
  const eventClass = event.classId ?? null;
  return eventClass === query.classId;
}

export async function listEvents(
  campusId: string,
  query?: { from?: string; to?: string; classId?: string | null },
) {
  const rows = await prisma.campusEvent.findMany({
    where: { campusId },
    orderBy: { startsAt: "desc" },
    take: 500,
  });
  if (
    !query ||
    (query.from === undefined && query.to === undefined && query.classId === undefined)
  ) {
    return rows.slice(0, 200);
  }
  return rows.filter((row) => eventMatchesQuery(row, query)).slice(0, 200);
}

export async function getEvent(campusId: string, id: string) {
  const row = await prisma.campusEvent.findFirst({
    where: { id, campusId },
  });
  if (!row) throw notFound("event");
  return row;
}

export async function patchEvent(
  campusId: string,
  id: string,
  patch: {
    title?: string;
    body?: string | null;
    classId?: string | null;
    startsAt?: string;
    endsAt?: string | null;
  },
) {
  const existing = await getEvent(campusId, id);
  const title = patch.title !== undefined ? patch.title.trim() : existing.title;
  if (!title) throw validationError({ title: "required" });
  const startsAt =
    patch.startsAt !== undefined ? new Date(patch.startsAt) : existing.startsAt;
  if (Number.isNaN(startsAt.getTime())) throw validationError({ startsAt: "invalid" });
  let endsAt = existing.endsAt;
  if (patch.endsAt !== undefined) {
    if (patch.endsAt === null || patch.endsAt === "") endsAt = null;
    else {
      endsAt = new Date(patch.endsAt);
      if (Number.isNaN(endsAt.getTime())) throw validationError({ endsAt: "invalid" });
    }
  }
  return prisma.campusEvent.update({
    where: { id },
    data: {
      title,
      ...(patch.body !== undefined ? { body: patch.body } : {}),
      ...(patch.classId !== undefined ? { classId: patch.classId } : {}),
      startsAt,
      endsAt,
    },
  });
}

export async function removeEvent(campusId: string, id: string) {
  await getEvent(campusId, id);
  await prisma.campusEvent.delete({ where: { id } });
  return { id, deleted: true };
}

export async function createEvent(
  campusId: string,
  input: {
    title: string;
    body?: string;
    classId?: string;
    startsAt: string;
    endsAt?: string;
  },
) {
  const title = input.title.trim();
  if (!title) throw validationError({ title: "required" });
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw validationError({ startsAt: "invalid" });
  }
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw validationError({ endsAt: "invalid" });
  }
  return prisma.campusEvent.create({
    data: {
      campusId,
      title,
      body: input.body,
      classId: input.classId,
      startsAt,
      endsAt,
    },
  });
}

export async function checkInDaycare(campusId: string, studentId: string) {
  await studentInCampus(campusId, studentId);
  const daycare = await prisma.studentDaycare.findUnique({
    where: { studentId },
  });
  if (!daycare?.enrolled) throw validationError({ enrolled: "required" });
  const open = await prisma.daycareVisit.findFirst({
    where: { daycareId: daycare.id, checkedOutAt: null },
  });
  if (open) throw conflict("already checked in");
  const now = new Date();
  const visit = await prisma.daycareVisit.create({
    data: { daycareId: daycare.id, checkedInAt: now },
  });
  await prisma.studentDaycare.update({
    where: { id: daycare.id },
    data: { lastCheckInAt: now },
  });
  return visit;
}

export async function checkOutDaycare(campusId: string, studentId: string) {
  await studentInCampus(campusId, studentId);
  const daycare = await prisma.studentDaycare.findUnique({
    where: { studentId },
  });
  if (!daycare) throw notFound("daycare");
  const open = await prisma.daycareVisit.findFirst({
    where: { daycareId: daycare.id, checkedOutAt: null },
    orderBy: { checkedInAt: "desc" },
  });
  if (!open) throw conflict("not checked in");
  const now = new Date();
  const visit = await prisma.daycareVisit.update({
    where: { id: open.id },
    data: { checkedOutAt: now },
  });
  await prisma.studentDaycare.update({
    where: { id: daycare.id },
    data: { lastCheckOutAt: now },
  });
  return visit;
}

import { prisma } from "./db";
import type { AuthPrincipal } from "./permissions";
import { hasPermission, permKey } from "./permissions";
import { schoolWorldRole } from "./school-world-shape";

export type NotificationItem = {
  id: string;
  kind: "message" | "notice" | "leave" | "admission";
  title: string;
  detail: string;
  at: string;
  /** Where clicking takes the user: a School World module, or a Campus desk screen. */
  target: { module: string; screen?: string };
};

const RECENT_DAYS = 30;
const PER_KIND = 5;

const isManager = (user: AuthPrincipal) => ["school_admin", "principal"].includes(schoolWorldRole(user));
const can = (user: AuthPrincipal, module: string, feature: string, action: string) =>
  isManager(user) || hasPermission(user, permKey(module, feature, action));

/**
 * What the signed-in staff member should look at: unread messages, recent notices they have not
 * opened, and (for those allowed to act) leave requests waiting for approval and new online
 * applications. Every query is scoped to the user's campus.
 */
export async function staffNotifications(user: AuthPrincipal) {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const unreadMessages = {
    campusId: user.campusId,
    recipients: { some: { userId: user.id, readAt: null } },
    OR: [{ status: "sent" }, { status: "scheduled", scheduledAt: { lte: now } }],
  };
  const unseenNotices = {
    campusId: user.campusId,
    isPublished: true,
    publishAt: { gte: since, lte: now },
    views: { none: { viewerUserId: user.id } },
  };
  const pendingLeave = { status: "pending", leaveType: { campusId: user.campusId } };
  const newApplications = { campusId: user.campusId, status: "APPLIED" as const, createdAt: { gte: since } };
  const seeLeave = can(user, "attendance", "leave", "approve");
  const seeAdmissions = can(user, "students", "profile", "view");

  const [messageCount, messages, noticeCount, notices, leaveCount, leaves, admissionCount, admissions] = await Promise.all([
    prisma.message.count({ where: unreadMessages }),
    prisma.message.findMany({ where: unreadMessages, orderBy: { sentAt: "desc" }, take: PER_KIND, select: { id: true, subject: true, body: true, sentAt: true, senderId: true } }),
    prisma.notice.count({ where: unseenNotices }),
    prisma.notice.findMany({ where: unseenNotices, orderBy: { publishAt: "desc" }, take: PER_KIND, select: { id: true, title: true, body: true, publishAt: true, noticeType: true, authorName: true } }),
    seeLeave ? prisma.leaveRequest.count({ where: pendingLeave }) : Promise.resolve(0),
    seeLeave ? prisma.leaveRequest.findMany({ where: pendingLeave, orderBy: { fromDate: "asc" }, take: PER_KIND, include: { leaveType: { select: { name: true } } } }) : Promise.resolve([]),
    seeAdmissions ? prisma.application.count({ where: newApplications }) : Promise.resolve(0),
    seeAdmissions ? prisma.application.findMany({ where: newApplications, orderBy: { createdAt: "desc" }, take: PER_KIND, select: { id: true, applicationNo: true, firstName: true, lastName: true, createdAt: true, program: { select: { name: true } } } }) : Promise.resolve([]),
  ]);

  const senderIds = [...new Set(messages.map((m) => m.senderId).filter((id): id is string => Boolean(id)))];
  const senders = senderIds.length
    ? await prisma.user.findMany({ where: { id: { in: senderIds }, campusId: user.campusId }, select: { id: true, firstName: true, lastName: true, username: true, staff: { select: { firstName: true, lastName: true } } } })
    : [];
  const senderName = (id: string | null) => {
    const s = senders.find((row) => row.id === id);
    if (!s) return "School";
    return [s.firstName, s.lastName].filter(Boolean).join(" ") || [s.staff?.firstName, s.staff?.lastName].filter(Boolean).join(" ") || s.username;
  };
  const people = [...new Set(leaves.flatMap((l) => [l.staffId, l.studentId]).filter((id): id is string => Boolean(id)))];
  const [staff, students] = people.length
    ? await Promise.all([
        prisma.staff.findMany({ where: { id: { in: people }, campusId: user.campusId }, select: { id: true, firstName: true, lastName: true } }),
        prisma.student.findMany({ where: { id: { in: people }, campusId: user.campusId }, select: { id: true, firstName: true, lastName: true } }),
      ])
    : [[], []];
  const personName = (id: string | null) => {
    const p = [...staff, ...students].find((row) => row.id === id);
    return p ? [p.firstName, p.lastName].filter(Boolean).join(" ") : "Someone";
  };
  const clip = (text: string, n = 90) => (text.length > n ? text.slice(0, n - 1).trimEnd() + "…" : text);
  const day = (d: Date) => d.toISOString().slice(0, 10);

  const items: NotificationItem[] = [
    ...messages.map((m) => ({ id: "message:" + m.id, kind: "message" as const, title: m.subject || "New message", detail: senderName(m.senderId) + " · " + clip(m.body.replace(/\s+/g, " ")), at: m.sentAt.toISOString(), target: { module: "Messages" } })),
    ...notices.map((n) => ({ id: "notice:" + n.id, kind: "notice" as const, title: n.title || n.noticeType || "Notice", detail: [n.authorName, clip(n.body.replace(/\s+/g, " "))].filter(Boolean).join(" · "), at: n.publishAt.toISOString(), target: { module: "Notice Board" } })),
    ...leaves.map((l) => ({ id: "leave:" + l.id, kind: "leave" as const, title: "Leave request: " + personName(l.staffId || l.studentId), detail: l.leaveType.name + " · " + day(l.fromDate) + (day(l.toDate) !== day(l.fromDate) ? " to " + day(l.toDate) : ""), at: l.fromDate.toISOString(), target: { module: "Campus desk", screen: "/staff/approve-leave" } })),
    ...admissions.map((a) => ({ id: "admission:" + a.id, kind: "admission" as const, title: "New application: " + [a.firstName, a.lastName].filter(Boolean).join(" "), detail: [a.applicationNo, a.program?.name].filter(Boolean).join(" · "), at: a.createdAt.toISOString(), target: { module: "Campus desk", screen: "/staff/admission/dashboard" } })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return {
    total: messageCount + noticeCount + leaveCount + admissionCount,
    counts: { messages: messageCount, notices: noticeCount, leave: leaveCount, admissions: admissionCount },
    items,
  };
}

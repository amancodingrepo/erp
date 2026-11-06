import { prisma } from "./db";
import type { AuthPrincipal } from "./permissions";

/**
 * Who may read a notice.
 *
 * Staff manage the Notice Board, so they see every notice in their school. A parent or student
 * sees a notice only when it is addressed to them: the whole school, their (or their child's)
 * class, bus route, or day care. Anything else, including "All Teachers" and unknown audiences,
 * is hidden. Unknown means hidden, so a new audience type never leaks by default.
 */

export type NoticeViewer =
  | { staff: true }
  | {
      staff: false;
      /** The signed-in student and a parent's children in this school. */
      studentIds: Set<string>;
      /** Class labels such as "1 (a)", compared in lower case. */
      classes: Set<string>;
      classIds: Set<string>;
      /** Route names in lower case, and transport route ids. */
      routes: Set<string>;
      routeIds: Set<string>;
      dayCare: boolean;
    };

/**
 * A notice's audience. School World saves `board` + `audienceKey`. The older /api/v1 notices save
 * `channelKind` + `audience` + `classId`/`routeId`, and leave board "school" and audienceKey "all".
 */
export type NoticeTarget = {
  board: string;
  audienceKey: string;
  publishAt: Date;
  isPublished?: boolean;
  audience?: string;
  channelKind?: string;
  classId?: string | null;
  routeId?: string | null;
};

// Audience values the Notice Board saves for the "school" board.
const WHOLE_SCHOOL = new Set(["__school__", "all", "students"]);
const DAY_CARE = "day_care";

/** Same rules as `normalizeClassName` in School World's noticeBoardUtils.js, so "Class 1 A" matches "1 (A)". */
export function normalizeClassName(input: unknown) {
  const raw = String(input ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  const early = raw.match(/^(PRE\s*NURSERY|NURSERY|KG\s*I{1,2}|LKG|UKG)\s*\(?\s*([A-G])\s*\)?$/i);
  if (early) {
    let level = early[1].toUpperCase().replace(/\s+/g, " ");
    if (level === "LKG") level = "KG I";
    if (level === "UKG") level = "KG II";
    return `${level} (${early[2].toUpperCase()})`;
  }
  const regular = raw.match(/^(?:CLASS\s*)?(\d{1,2}|I{1,3}|IV|V|VI|VII|VIII|IX|X|XI|XII)(?:\s+(SCIENCE|COMMERCE|HUMANITIES))?\s*\(?\s*([A-G])\s*\)?$/i);
  if (regular) {
    const roman: Record<string, string> = { I: "1", II: "2", III: "3", IV: "4", V: "5", VI: "6", VII: "7", VIII: "8", IX: "9", X: "10", XI: "11", XII: "12" };
    const grade = roman[regular[1].toUpperCase()] || regular[1];
    const stream = regular[2] ? ` ${regular[2].toUpperCase()}` : "";
    return `${grade}${stream} (${regular[3].toUpperCase()})`;
  }
  return raw;
}

const key = (value: unknown) => String(value ?? "").trim().toLowerCase();
const classKey = (value: unknown) => key(normalizeClassName(value));
const yes = (value: unknown) => value === true || key(value) === "yes" || key(value) === "true";

/** Every label a class and section might be addressed by: "1 (A)", and the whole class ("1"), which reaches all its sections. */
export function classLabels(className: string, sectionName: string) {
  const section = sectionName && sectionName !== "—" ? sectionName : "";
  const labels = section ? [`${className} (${section})`, `${className} ${section}`, className] : [className];
  return labels.map(classKey).filter(Boolean);
}

export function isStaffViewer(principal: AuthPrincipal) {
  return principal.actorType !== "STUDENT" && principal.actorType !== "GUARDIAN" && principal.actorType !== "APPLICANT";
}

/** The classes, routes and day care of the signed-in student, or of a parent's children in this school. */
export async function noticeViewer(principal: AuthPrincipal): Promise<NoticeViewer> {
  if (isStaffViewer(principal)) return { staff: true };
  const ids = [...new Set([principal.studentId, ...(principal.childIds ?? [])].filter((id): id is string => Boolean(id)))];
  const viewer = {
    staff: false as const,
    studentIds: new Set<string>(),
    classes: new Set<string>(),
    classIds: new Set<string>(),
    routes: new Set<string>(),
    routeIds: new Set<string>(),
    dayCare: false,
  };
  if (!ids.length) return viewer;
  const students = await prisma.student.findMany({
    where: { id: { in: ids }, campusId: principal.campusId },
    select: {
      id: true,
      details: true,
      enrollments: { where: { isCurrent: true }, select: { classId: true, class: { select: { name: true } }, section: { select: { name: true } } } },
      transport: { select: { routeId: true, outRouteId: true, route: { select: { name: true } }, outRoute: { select: { name: true } } } },
      daycare: { select: { enrolled: true } },
    },
  });
  for (const student of students) {
    viewer.studentIds.add(student.id);
    for (const enrollment of student.enrollments) {
      viewer.classIds.add(enrollment.classId);
      for (const label of classLabels(enrollment.class.name, enrollment.section.name)) viewer.classes.add(label);
    }
    const details = (student.details && typeof student.details === "object" ? student.details : {}) as Record<string, Record<string, unknown> | undefined>;
    const transport = details.transport ?? {};
    if (yes(transport.enabled) && key(transport.routeName)) viewer.routes.add(key(transport.routeName));
    for (const route of [student.transport?.route?.name, student.transport?.outRoute?.name]) if (key(route)) viewer.routes.add(key(route));
    for (const id of [student.transport?.routeId, student.transport?.outRouteId]) if (id) viewer.routeIds.add(id);
    if (student.daycare?.enrolled || yes(details.dayCare?.enabled)) viewer.dayCare = true;
  }
  return viewer;
}

export function canSeeNotice(notice: NoticeTarget, viewer: NoticeViewer, now = new Date()) {
  if (viewer.staff) return true;
  if (notice.isPublished === false) return false; // waiting for approval
  if (notice.publishAt.getTime() > now.getTime()) return false; // scheduled, not out yet
  const board = key(notice.board);
  const audience = key(notice.audienceKey);
  // Older /api/v1 notices keep the defaults board "school" + audienceKey "all" and say who they are for in channelKind.
  if (board === "school" && audience === "all") return canSeeLegacyNotice(notice, viewer);
  switch (board) {
    case "school":
      if (WHOLE_SCHOOL.has(audience)) return true;
      return audience === DAY_CARE && viewer.dayCare;
    case "class":
      return viewer.classes.has(classKey(notice.audienceKey));
    case "route":
      return viewer.routes.has(audience);
    default:
      return false;
  }
}

function canSeeLegacyNotice(notice: NoticeTarget, viewer: Extract<NoticeViewer, { staff: false }>) {
  const audience = key(notice.audience ?? "all");
  if (audience === "staff") return false;
  switch (key(notice.channelKind ?? "school")) {
    case "school":
      return audience === "all" || audience === "students" || audience === "class";
    case "daycare":
      return viewer.dayCare;
    case "class":
      return Boolean(notice.classId && viewer.classIds.has(notice.classId));
    case "route":
      return Boolean(notice.routeId && viewer.routeIds.has(notice.routeId));
    default: // "teachers" and anything unknown
      return false;
  }
}

/** Replies a parent or student may read: the school's own replies, and their family's. */
export function canSeeReply(reply: { authorRole: string; studentId?: string }, viewer: NoticeViewer) {
  if (viewer.staff || reply.authorRole === "staff") return true;
  return Boolean(reply.studentId && viewer.studentIds.has(reply.studentId));
}

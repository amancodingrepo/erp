import { AttendanceStatus } from "@prisma/client";
import { parseDateOnly } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { forbidden, notFound, validationError } from "@/lib/errors";
import type { AuthPrincipal } from "@/lib/permissions";

const DAILY_SUBJECT = "";

export function subjectKey(subjectId?: string | null) {
  return subjectId || DAILY_SUBJECT;
}

export function eachUtcDate(from: Date, to: Date) {
  const dates: Date[] = [];
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  for (let t = start; t <= end; t += 86400000) {
    dates.push(new Date(t));
  }
  return dates;
}

async function lockDays(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: "attendance.lockDays" } },
  });
  const n = Number(row?.value ?? 7);
  return Number.isFinite(n) ? n : 7;
}

function canBypassLock(user: AuthPrincipal) {
  return user.roles.includes("SuperAdmin") || user.roles.includes("Principal");
}

export async function assertMarkableDate(input: {
  campusId: string;
  date: Date;
  user: AuthPrincipal;
  override?: boolean;
}) {
  const day = await prisma.workingDay.findUnique({
    where: { campusId_date: { campusId: input.campusId, date: input.date } },
  });
  if (day && !day.isWorking && !input.override) {
    throw validationError({ date: "holiday" });
  }
  const maxAge = await lockDays(input.campusId);
  if (maxAge > 0 && !canBypassLock(input.user)) {
    const today = parseDateOnly(new Date().toISOString().slice(0, 10));
    const age = Math.floor(
      (today.getTime() - input.date.getTime()) / 86400000,
    );
    if (age > maxAge) {
      throw forbidden("attendance locked");
    }
  }
}

export async function markStudents(input: {
  user: AuthPrincipal;
  date: string;
  sectionId: string;
  subjectId?: string;
  override?: boolean;
  entries: Array<{ studentId: string; status: AttendanceStatus }>;
}) {
  const date = parseDateOnly(input.date);
  await assertMarkableDate({
    campusId: input.user.campusId,
    date,
    user: input.user,
    override: input.override,
  });
  const subjectId = subjectKey(input.subjectId);
  const ids = input.entries.map((e) => e.studentId);
  const allowed = await prisma.studentEnrollment.findMany({
    where: {
      sectionId: input.sectionId,
      isCurrent: true,
      studentId: { in: ids },
      student: { campusId: input.user.campusId },
    },
  });
  const allowedSet = new Set(allowed.map((e) => e.studentId));
  const entries = input.entries.filter((e) => allowedSet.has(e.studentId));
  await prisma.$transaction(
    entries.map((entry) =>
      prisma.studentAttendance.upsert({
        where: {
          studentId_date_subjectId: {
            studentId: entry.studentId,
            date,
            subjectId,
          },
        },
        update: { status: entry.status, markedBy: input.user.id },
        create: {
          studentId: entry.studentId,
          date,
          subjectId,
          status: entry.status,
          markedBy: input.user.id,
        },
      }),
    ),
  );
  return { ok: true, count: entries.length };
}

export async function roster(input: {
  campusId: string;
  sectionId?: string;
  date: string;
  subjectId?: string;
}) {
  const date = parseDateOnly(input.date);
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      isCurrent: true,
      ...(input.sectionId ? { sectionId: input.sectionId } : {}),
      student: { campusId: input.campusId },
    },
    include: { student: true },
  });
  const marks = await prisma.studentAttendance.findMany({
    where: {
      date,
      studentId: { in: enrollments.map((e) => e.studentId) },
      subjectId: subjectKey(input.subjectId),
    },
  });
  const byStudent = new Map(marks.map((m) => [m.studentId, m]));
  return {
    date: input.date,
    data: enrollments.map((e) => ({
      studentId: e.studentId,
      admissionNo: e.student.admissionNo,
      name: [e.student.firstName, e.student.lastName].filter(Boolean).join(" "),
      status: byStudent.get(e.studentId)?.status ?? null,
    })),
  };
}

export async function monthlyReport(input: {
  campusId: string;
  sectionId?: string;
  from?: string;
  to?: string;
}) {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      isCurrent: true,
      ...(input.sectionId ? { sectionId: input.sectionId } : {}),
      student: { campusId: input.campusId },
    },
    include: { student: true },
  });
  const rows = await prisma.studentAttendance.findMany({
    where: {
      studentId: { in: enrollments.map((e) => e.studentId) },
      date: {
        ...(input.from ? { gte: parseDateOnly(input.from) } : {}),
        ...(input.to ? { lte: parseDateOnly(input.to) } : {}),
      },
    },
  });
  const grouped = new Map<string, { present: number; total: number }>();
  for (const row of rows) {
    if (row.status === AttendanceStatus.HOLIDAY) continue;
    const bucket = grouped.get(row.studentId) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (
      row.status === AttendanceStatus.PRESENT ||
      row.status === AttendanceStatus.LATE ||
      row.status === AttendanceStatus.HALFDAY
    ) {
      bucket.present += 1;
    }
    grouped.set(row.studentId, bucket);
  }
  return {
    data: enrollments.map((e) => {
      const stats = grouped.get(e.studentId) ?? { present: 0, total: 0 };
      return {
        studentId: e.studentId,
        name: [e.student.firstName, e.student.lastName].filter(Boolean).join(" "),
        present: stats.present,
        total: stats.total,
        percent: stats.total
          ? Math.round((stats.present / stats.total) * 1000) / 10
          : 0,
      };
    }),
  };
}

export async function approveLeave(input: {
  user: AuthPrincipal;
  requestId: string;
}) {
  const request = await prisma.leaveRequest.findFirst({
    where: {
      id: input.requestId,
      leaveType: { campusId: input.user.campusId },
    },
  });
  if (!request) throw notFound("leave request");
  if (request.status === "approved") return request;

  const dates = eachUtcDate(request.fromDate, request.toDate);
  const holidays = await prisma.workingDay.findMany({
    where: {
      campusId: input.user.campusId,
      isWorking: false,
      date: { gte: request.fromDate, lte: request.toDate },
    },
  });
  const holidaySet = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: request.id },
      data: { status: "approved", approverId: input.user.id },
    });
    if (request.studentId) {
      for (const date of dates) {
        const key = date.toISOString().slice(0, 10);
        if (holidaySet.has(key)) continue;
        await tx.studentAttendance.upsert({
          where: {
            studentId_date_subjectId: {
              studentId: request.studentId,
              date,
              subjectId: DAILY_SUBJECT,
            },
          },
          update: { status: AttendanceStatus.LEAVE, markedBy: input.user.id },
          create: {
            studentId: request.studentId,
            date,
            subjectId: DAILY_SUBJECT,
            status: AttendanceStatus.LEAVE,
            markedBy: input.user.id,
          },
        });
      }
    }
  });
  return prisma.leaveRequest.findUniqueOrThrow({ where: { id: request.id } });
}

export async function markStaff(input: {
  user: AuthPrincipal;
  date: string;
  override?: boolean;
  entries: Array<{
    staffId: string;
    status: AttendanceStatus;
    inTime?: string;
    outTime?: string;
  }>;
}) {
  const date = parseDateOnly(input.date);
  await assertMarkableDate({
    campusId: input.user.campusId,
    date,
    user: input.user,
    override: input.override,
  });
  const staff = await prisma.staff.findMany({
    where: {
      campusId: input.user.campusId,
      id: { in: input.entries.map((e) => e.staffId) },
    },
  });
  const allowed = new Set(staff.map((s) => s.id));
  const entries = input.entries.filter((e) => allowed.has(e.staffId));
  await prisma.$transaction(
    entries.map((entry) =>
      prisma.staffAttendance.upsert({
        where: { staffId_date: { staffId: entry.staffId, date } },
        update: {
          status: entry.status,
          inTime: entry.inTime,
          outTime: entry.outTime,
        },
        create: {
          staffId: entry.staffId,
          date,
          status: entry.status,
          inTime: entry.inTime,
          outTime: entry.outTime,
        },
      }),
    ),
  );
  return { ok: true, count: entries.length };
}

export type LeaveCreate = {
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  reason?: string;
  studentId?: string;
  staffId?: string;
};

export async function applyLeave(input: { campusId: string; body: LeaveCreate }) {
  if (!input.body.studentId && !input.body.staffId) {
    throw validationError({ studentId: "studentId or staffId required" });
  }
  const type = await prisma.leaveType.findFirst({
    where: { id: input.body.leaveTypeId, campusId: input.campusId },
  });
  if (!type) throw notFound("leave type");
  const fromDate = parseDateOnly(input.body.fromDate);
  const toDate = parseDateOnly(input.body.toDate);
  if (toDate < fromDate) throw validationError({ toDate: "must be on or after fromDate" });
  if (input.body.studentId) {
    const student = await prisma.student.findFirst({
      where: { id: input.body.studentId, campusId: input.campusId },
    });
    if (!student) throw notFound("student");
  }
  if (input.body.staffId) {
    const staff = await prisma.staff.findFirst({
      where: { id: input.body.staffId, campusId: input.campusId },
    });
    if (!staff) throw notFound("staff");
  }
  return prisma.leaveRequest.create({
    data: {
      leaveTypeId: type.id,
      fromDate,
      toDate,
      reason: input.body.reason,
      studentId: input.body.studentId,
      staffId: input.body.staffId,
      status: "pending",
    },
  });
}
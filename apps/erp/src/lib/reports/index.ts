import { InvoiceStatus, StudentStatus } from "@prisma/client";
import { parseDateOnly } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { monthlyReport } from "@/lib/services/attendance";
import { dueSearch } from "@/lib/services/fees";
import {
  dailyAttendanceRows,
  libraryIssueRows,
  noticeViewRows,
  payrollSlipRows,
  storeOrderRows,
  strengthRows,
  visitorRows,
  resultSummaryRows,
  examAbsentRows,
  consolidatedPerformanceRows,
  fuelLogRows,
} from "./aggregate";
import { listFuelLogs } from "@/lib/services/campus-transport-ops";
import { listStoreOrders } from "@/lib/services/engagement";
import { admissionTestReportGrain } from "@/lib/services/campus-admission-tests";
import { type ReportResult } from "./keys";
import { resolveReportKey } from "./schema";

export type { ReportKey, ReportResult } from "./keys";
export { REPORT_KEYS, isReportKey } from "./keys";
export {
  listReportCatalog,
  parseReportFilters,
  pickReportColumns,
  reportSchema,
  resolveReportKey,
  toXlsx,
  xlsxFilename,
} from "./schema";

type Filters = {
  classId?: string;
  sectionId?: string;
  from?: string;
  to?: string;
  feeGroupId?: string;
};

function csvCell(value: string | number | null) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(report: ReportResult) {
  const header = report.columns.join(",");
  const lines = report.rows.map((row) =>
    report.columns.map((col) => csvCell(row[col] ?? null)).join(","),
  );
  return [header, ...lines].join("\n");
}

export async function runReport(
  key: string,
  campusId: string,
  filters: Filters,
): Promise<ReportResult> {
  const resolved = resolveReportKey(key);
  switch (resolved) {
    case "students":
      return studentInfo(campusId, filters);
    case "strength":
      return strength(campusId, filters);
    case "daily-collection":
      return dailyCollection(campusId, filters);
    case "head-collection":
      return headCollection(campusId, filters);
    case "dues":
      return dues(campusId, filters);
    case "attendance-register":
      return attendanceRegister(campusId, filters);
    case "daily-attendance":
      return dailyAttendance(campusId, filters);
    case "attendance-percent":
      return attendancePercent(campusId, filters);
    case "notice-views":
      return noticeViews(campusId);
    case "exam-results":
      return examResults(campusId);
    case "user-log":
      return userLog(campusId);
    case "payment-log":
      return paymentLog(campusId, filters);
    case "audit":
      return auditTrail(campusId);
    case "staff":
      return staffDirectory(campusId);
    case "disabled-students":
      return disabledStudents(campusId);
    case "library-issues":
      return libraryIssues(campusId);
    case "payroll":
      return payroll(campusId);
    case "visitors":
      return visitors(campusId);
    case "store-orders":
      return storeOrders(campusId);
    case "result-summary":
      return resultSummary(campusId);
    case "exam-absent":
      return examAbsent(campusId);
    case "consolidated-performance":
      return consolidatedPerformance(campusId);
    case "admission-tests":
      return admissionTests(campusId);
    case "fuel-logs":
      return fuelLogs(campusId);
  }
}

async function strength(campusId: string, filters: Filters): Promise<ReportResult> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      isCurrent: true,
      ...(filters.classId ? { classId: filters.classId } : {}),
      ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
      student: { campusId, status: StudentStatus.ACTIVE },
    },
    include: {
      class: { select: { name: true } },
      section: { select: { name: true } },
      student: { select: { gender: true } },
    },
  });
  const rows = strengthRows(
    enrollments.map((row) => ({
      className: row.class.name,
      sectionName: row.section.name,
      gender: row.student.gender,
    })),
  );
  return {
    title: "Student strength",
    columns: ["class", "section", "gender", "count"],
    rows,
  };
}

async function dailyAttendance(
  campusId: string,
  filters: Filters,
): Promise<ReportResult> {
  const from = filters.from ? parseDateOnly(filters.from) : undefined;
  const to = filters.to ? parseDateOnly(filters.to) : undefined;
  const marks = await prisma.studentAttendance.findMany({
    where: {
      student: {
        campusId,
        ...(filters.classId || filters.sectionId
          ? {
              enrollments: {
                some: {
                  isCurrent: true,
                  ...(filters.classId ? { classId: filters.classId } : {}),
                  ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
                },
              },
            }
          : {}),
      },
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      student: {
        include: {
          enrollments: {
            where: { isCurrent: true },
            include: {
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
            take: 1,
          },
        },
      },
    },
    take: 5000,
  });
  const rows = dailyAttendanceRows(
    marks.map((mark) => ({
      date: mark.date,
      className: mark.student.enrollments[0]?.class.name ?? "",
      sectionName: mark.student.enrollments[0]?.section.name ?? "",
      status: mark.status,
    })),
  );
  return {
    title: "Daily class attendance",
    columns: ["date", "class", "section", "status", "count"],
    rows,
  };
}

async function noticeViews(campusId: string): Promise<ReportResult> {
  const notices = await prisma.notice.findMany({
    where: { campusId, isPublished: true },
    orderBy: { publishAt: "desc" },
    take: 200,
  });
  const reads = await prisma.noticeRead.findMany({
    where: { noticeId: { in: notices.map((notice) => notice.id) } },
    select: { noticeId: true },
  });
  return {
    title: "Notice views",
    columns: ["title", "channel", "type", "publishAt", "readCount"],
    rows: noticeViewRows(notices, reads),
  };
}

async function studentInfo(campusId: string, filters: Filters): Promise<ReportResult> {
  const rows = await prisma.student.findMany({
    where: {
      campusId,
      status: StudentStatus.ACTIVE,
      ...(filters.classId || filters.sectionId
        ? {
            enrollments: {
              some: {
                isCurrent: true,
                ...(filters.classId ? { classId: filters.classId } : {}),
                ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
              },
            },
          }
        : {}),
    },
    include: {
      enrollments: {
        where: { isCurrent: true },
        include: { class: true, section: true },
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 500,
  });
  return {
    title: "Student information",
    columns: ["admissionNo", "name", "class", "section", "mobile"],
    rows: rows.map((s) => ({
      admissionNo: s.admissionNo,
      name: [s.firstName, s.lastName].filter(Boolean).join(" "),
      class: s.enrollments[0]?.class.name ?? null,
      section: s.enrollments[0]?.section.name ?? null,
      mobile: s.mobile,
    })),
  };
}

async function dailyCollection(campusId: string, filters: Filters): Promise<ReportResult> {
  const from = filters.from ? parseDateOnly(filters.from) : undefined;
  const to = filters.to ? parseDateOnly(filters.to) : undefined;
  const payments = await prisma.payment.findMany({
    where: {
      cancelledAt: null,
      amount: { gt: 0 },
      invoice: { student: { campusId } },
      ...(from || to
        ? {
            paidAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: { invoice: { include: { student: true } } },
    orderBy: { paidAt: "desc" },
    take: 500,
  });
  return {
    title: "Daily fee collection",
    columns: ["paidAt", "receiptNo", "admissionNo", "name", "amount", "method"],
    rows: payments.map((p) => ({
      paidAt: p.paidAt.toISOString().slice(0, 10),
      receiptNo: p.receiptNo,
      admissionNo: p.invoice.student.admissionNo,
      name: [p.invoice.student.firstName, p.invoice.student.lastName]
        .filter(Boolean)
        .join(" "),
      amount: p.amount.toString(),
      method: p.method,
    })),
  };
}

async function headCollection(campusId: string, filters: Filters): Promise<ReportResult> {
  const lines = await prisma.feeInvoiceLine.findMany({
    where: {
      invoice: {
        student: { campusId },
        status: { in: [InvoiceStatus.PARTIAL, InvoiceStatus.PAID, InvoiceStatus.DUE] },
        ...(filters.feeGroupId ? { master: { groupId: filters.feeGroupId } } : {}),
      },
    },
  });
  const grouped = new Map<string, { paid: number; amount: number }>();
  for (const line of lines) {
    const bucket = grouped.get(line.description) ?? { paid: 0, amount: 0 };
    bucket.paid += Number(line.paid);
    bucket.amount += Number(line.amount);
    grouped.set(line.description, bucket);
  }
  return {
    title: "Head-wise collection",
    columns: ["head", "amount", "paid"],
    rows: [...grouped.entries()].map(([head, v]) => ({
      head,
      amount: v.amount,
      paid: v.paid,
    })),
  };
}

async function dues(campusId: string, filters: Filters): Promise<ReportResult> {
  const result = await dueSearch({
    campusId,
    classId: filters.classId,
    sectionId: filters.sectionId,
    feeGroupIds: filters.feeGroupId ? [filters.feeGroupId] : [],
  });
  return {
    title: "Balance / due fees",
    columns: ["admissionNo", "name", "feeGroup", "description", "balance"],
    rows: result.data.map((row) => ({
      admissionNo: row.admissionNo,
      name: row.name,
      feeGroup: row.feeGroup,
      description: row.description,
      balance: row.balance,
    })),
  };
}

async function attendanceRegister(campusId: string, filters: Filters): Promise<ReportResult> {
  const from = filters.from ? parseDateOnly(filters.from) : undefined;
  const to = filters.to ? parseDateOnly(filters.to) : undefined;
  const rows = await prisma.studentAttendance.findMany({
    where: {
      student: {
        campusId,
        ...(filters.sectionId
          ? {
              enrollments: {
                some: { isCurrent: true, sectionId: filters.sectionId },
              },
            }
          : {}),
      },
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: { student: true },
    orderBy: [{ date: "asc" }, { student: { lastName: "asc" } }],
    take: 1000,
  });
  return {
    title: "Attendance monthly register",
    columns: ["date", "admissionNo", "name", "status"],
    rows: rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      admissionNo: r.student.admissionNo,
      name: [r.student.firstName, r.student.lastName].filter(Boolean).join(" "),
      status: r.status,
    })),
  };
}

async function attendancePercent(campusId: string, filters: Filters): Promise<ReportResult> {
  const result = await monthlyReport({
    campusId,
    sectionId: filters.sectionId,
    from: filters.from,
    to: filters.to,
  });
  return {
    title: "Class attendance %",
    columns: ["name", "present", "total", "percent"],
    rows: result.data.map((r) => ({
      name: r.name,
      present: r.present,
      total: r.total,
      percent: r.percent,
    })),
  };
}

async function examResults(campusId: string): Promise<ReportResult> {
  const marks = await prisma.examMark.findMany({
    where: { student: { campusId } },
    include: {
      student: true,
      examSubject: { include: { exam: { include: { group: true } } } },
    },
    take: 500,
    orderBy: { student: { lastName: "asc" } },
  });
  return {
    title: "Exam result list",
    columns: ["admissionNo", "name", "group", "exam", "marks", "status"],
    rows: marks.map((m) => ({
      admissionNo: m.student.admissionNo,
      name: [m.student.firstName, m.student.lastName].filter(Boolean).join(" "),
      group: m.examSubject.exam.group.name,
      exam: m.examSubject.exam.name,
      marks: m.isAbsent ? "AB" : m.marks?.toString() ?? "",
      status: m.isBlocked ? "withheld" : m.finalizedAt ? "final" : "draft",
    })),
  };
}

async function userLog(campusId: string): Promise<ReportResult> {
  const users = await prisma.user.findMany({
    where: { campusId },
    orderBy: { lastLoginAt: "desc" },
    take: 200,
  });
  return {
    title: "User log",
    columns: ["username", "actorType", "lastLoginAt", "isActive"],
    rows: users.map((u) => ({
      username: u.username,
      actorType: u.actorType,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      isActive: u.isActive ? "yes" : "no",
    })),
  };
}

async function paymentLog(campusId: string, filters: Filters): Promise<ReportResult> {
  const payments = await prisma.payment.findMany({
    where: {
      invoice: { student: { campusId } },
      ...(filters.from || filters.to
        ? {
            paidAt: {
              ...(filters.from ? { gte: parseDateOnly(filters.from) } : {}),
              ...(filters.to ? { lte: parseDateOnly(filters.to) } : {}),
            },
          }
        : {}),
    },
    include: { invoice: { include: { student: true } } },
    orderBy: { paidAt: "desc" },
    take: 500,
  });
  return {
    title: "Payment log",
    columns: ["receiptNo", "paidAt", "admissionNo", "amount", "method", "cancelled"],
    rows: payments.map((p) => ({
      receiptNo: p.receiptNo,
      paidAt: p.paidAt.toISOString(),
      admissionNo: p.invoice.student.admissionNo,
      amount: p.amount.toString(),
      method: p.method,
      cancelled: p.cancelledAt ? "yes" : "no",
    })),
  };
}

async function auditTrail(campusId: string): Promise<ReportResult> {
  const rows = await prisma.auditLog.findMany({
    where: { campusId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return {
    title: "Audit trail",
    columns: ["createdAt", "user", "action", "entity", "entityId"],
    rows: rows.map((r) => ({
      createdAt: r.createdAt.toISOString(),
      user: r.user?.username ?? "",
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
    })),
  };
}

async function staffDirectory(campusId: string): Promise<ReportResult> {
  const rows = await prisma.staff.findMany({
    where: { campusId },
    include: { department: true, designation: true },
    orderBy: { firstName: "asc" },
  });
  return {
    title: "Staff directory",
    columns: ["employeeId", "name", "department", "designation", "phone"],
    rows: rows.map((s) => ({
      employeeId: s.employeeId,
      name: [s.firstName, s.lastName].filter(Boolean).join(" "),
      department: s.department?.name ?? null,
      designation: s.designation?.name ?? null,
      phone: s.phone,
    })),
  };
}

async function libraryIssues(campusId: string): Promise<ReportResult> {
  const issues = await prisma.bookIssue.findMany({
    where: { book: { campusId } },
    include: { book: true, member: true },
    orderBy: { issuedAt: "desc" },
    take: 500,
  });
  return {
    title: "Library issues",
    columns: ["title", "memberNo", "issuedAt", "dueOn", "returned", "fine"],
    rows: libraryIssueRows(
      issues.map((row) => ({
        title: row.book.title,
        memberNo: row.member.memberNo,
        issuedAt: row.issuedAt,
        dueOn: row.dueOn,
        returnedAt: row.returnedAt,
        fine: row.fine.toString(),
      })),
    ),
  };
}

async function payroll(campusId: string): Promise<ReportResult> {
  const slips = await prisma.payrollSlip.findMany({
    where: { run: { campusId } },
    include: { staff: true, run: true },
    take: 500,
  });
  return {
    title: "Payroll slips",
    columns: ["employeeId", "name", "period", "gross", "pf", "esi", "tds", "net"],
    rows: payrollSlipRows(
      slips.map((row) => ({
        employeeId: row.staff.employeeId,
        name: [row.staff.firstName, row.staff.lastName].filter(Boolean).join(" "),
        year: row.run.year,
        month: row.run.month,
        gross: row.gross.toString(),
        pf: row.pf.toString(),
        esi: row.esi.toString(),
        tds: row.tds.toString(),
        net: row.net.toString(),
      })),
    ),
  };
}

async function visitors(campusId: string): Promise<ReportResult> {
  const rows = await prisma.visitor.findMany({
    where: { campusId },
    orderBy: { inAt: "desc" },
    take: 500,
  });
  return {
    title: "Visitor register",
    columns: ["name", "purpose", "inAt", "outAt"],
    rows: visitorRows(rows),
  };
}

async function storeOrders(campusId: string): Promise<ReportResult> {
  const orders = await listStoreOrders(campusId);
  return {
    title: "Store orders",
    columns: ["studentId", "itemId", "qty", "amount", "source", "status"],
    rows: storeOrderRows(orders),
  };
}

async function disabledStudents(campusId: string): Promise<ReportResult> {
  const rows = await prisma.student.findMany({
    where: { campusId, status: StudentStatus.DISABLED },
    orderBy: { lastName: "asc" },
  });
  return {
    title: "Disabled students",
    columns: ["admissionNo", "name", "mobile"],
    rows: rows.map((s) => ({
      admissionNo: s.admissionNo,
      name: [s.firstName, s.lastName].filter(Boolean).join(" "),
      mobile: s.mobile,
    })),
  };
}

async function examMarksForCampus(campusId: string) {
  const marks = await prisma.examMark.findMany({
    where: { student: { campusId } },
    include: {
      student: { select: { firstName: true, lastName: true } },
      examSubject: { include: { exam: { select: { name: true } } } },
    },
    take: 5000,
  });
  const subjectIds = [...new Set(marks.map((row) => row.examSubject.subjectId))];
  const subjects = subjectIds.length
    ? await prisma.subject.findMany({
        where: { campusId, id: { in: subjectIds } },
        select: { id: true, name: true },
      })
    : [];
  const subjectName = new Map(subjects.map((row) => [row.id, row.name]));
  return marks.map((row) => ({
    student: [row.student.firstName, row.student.lastName]
      .filter(Boolean)
      .join(" "),
    exam: row.examSubject.exam.name,
    subject: subjectName.get(row.examSubject.subjectId) ?? row.examSubject.subjectId,
    marks: row.marks == null ? null : Number(row.marks),
    isAbsent: row.isAbsent,
  }));
}

async function resultSummary(campusId: string): Promise<ReportResult> {
  return {
    title: "Result summary",
    columns: ["exam", "subject", "students", "present", "absent", "average"],
    rows: resultSummaryRows(await examMarksForCampus(campusId)),
  };
}

async function examAbsent(campusId: string): Promise<ReportResult> {
  return {
    title: "Exam absents",
    columns: ["student", "exam", "subject"],
    rows: examAbsentRows(await examMarksForCampus(campusId)),
  };
}

async function consolidatedPerformance(campusId: string): Promise<ReportResult> {
  return {
    title: "Consolidated performance",
    columns: ["student", "exam", "total", "count", "average", "absences"],
    rows: consolidatedPerformanceRows(await examMarksForCampus(campusId)),
  };
}

async function admissionTests(campusId: string): Promise<ReportResult> {
  return {
    title: "Admission tests",
    columns: ["test", "date", "applicationNo", "name", "score", "appeared"],
    rows: await admissionTestReportGrain(campusId),
  };
}

async function fuelLogs(campusId: string): Promise<ReportResult> {
  return {
    title: "Transport fuel logs",
    columns: ["vehicleId", "litres", "amount", "odometer", "at", "note"],
    rows: fuelLogRows(await listFuelLogs(campusId)),
  };
}


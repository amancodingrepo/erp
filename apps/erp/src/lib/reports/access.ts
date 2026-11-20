import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { assertStaff, requireApiPermission } from "@/lib/principal";
import type { ReportKey } from "./keys";
import { parseReportFilters, resolveReportKey } from "./schema";

const STUDENTS = ["students", "profile", "view"] as const;
const FEES = ["fees", "collect", "view"] as const;
const ATTENDANCE = ["attendance", "student", "view"] as const;
const EXAMS = ["exams", "marks", "view"] as const;
const HR = ["hr", "staff", "view"] as const;
const NOTICE = ["communicate", "notice", "view"] as const;
const USERS = ["settings", "users", "view"] as const;

const REPORT_PERMISSION: Record<ReportKey, readonly [string, string, string]> = {
  students: STUDENTS,
  strength: STUDENTS,
  "disabled-students": STUDENTS,
  "admission-tests": STUDENTS,
  "admission-summary": STUDENTS,
  "student-log": STUDENTS,
  visitors: STUDENTS,
  "hostel-students": STUDENTS,
  "library-issues": STUDENTS,
  "store-orders": STUDENTS,
  "fuel-logs": STUDENTS,
  "transport-students": STUDENTS,
  "daily-collection": FEES,
  "head-collection": FEES,
  dues: FEES,
  "payment-log": FEES,
  "attendance-register": ATTENDANCE,
  "daily-attendance": ATTENDANCE,
  "attendance-percent": ATTENDANCE,
  "notice-views": NOTICE,
  "exam-results": EXAMS,
  "exam-absent": EXAMS,
  "result-summary": EXAMS,
  "consolidated-performance": EXAMS,
  backlog: EXAMS,
  staff: HR,
  payroll: HR,
  "user-log": USERS,
  audit: USERS,
};

export function reportPermission(key: string) {
  return REPORT_PERMISSION[resolveReportKey(key)];
}

export async function requireReport(request: Request, key: string) {
  const [module, feature, action] = reportPermission(key);
  const user = await requireApiPermission(request, module, feature, action);
  assertStaff(user);
  return user;
}

export function reportFiltersFrom(request: Request) {
  const params = new URL(request.url).searchParams;
  return parseReportFilters({
    classId: params.get("classId") ?? params.get("class_id"),
    sectionId: params.get("sectionId") ?? params.get("section_id"),
    from: params.get("from"),
    to: params.get("to"),
    feeGroupId: params.get("feeGroupId") ?? params.get("fee_group_id"),
  });
}

export async function assertReportFilters(
  campusId: string,
  filters: { classId?: string; sectionId?: string; feeGroupId?: string },
) {
  if (filters.classId) {
    const row = await prisma.class.findFirst({
      where: { id: filters.classId, program: { department: { campusId } } },
      select: { id: true },
    });
    if (!row) throw notFound("class");
  }
  if (filters.sectionId) {
    const row = await prisma.section.findFirst({
      where: {
        id: filters.sectionId,
        class: { program: { department: { campusId } } },
      },
      select: { id: true },
    });
    if (!row) throw notFound("section");
  }
  if (filters.feeGroupId) {
    const row = await prisma.feeGroup.findFirst({
      where: { id: filters.feeGroupId, campusId },
      select: { id: true },
    });
    if (!row) throw notFound("fee group");
  }
}

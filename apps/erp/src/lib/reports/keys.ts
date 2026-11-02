export const REPORT_KEYS = [
  "students",
  "strength",
  "daily-collection",
  "head-collection",
  "dues",
  "attendance-register",
  "daily-attendance",
  "attendance-percent",
  "notice-views",
  "exam-results",
  "user-log",
  "payment-log",
  "audit",
  "staff",
  "disabled-students",
  "library-issues",
  "payroll",
  "visitors",
  "store-orders",
  "result-summary",
  "exam-absent",
  "consolidated-performance",
  "admission-tests",
  "fuel-logs",
] as const;

export type ReportKey = (typeof REPORT_KEYS)[number];

export type ReportResult = {
  title: string;
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
};

export function isReportKey(value: string): value is ReportKey {
  return (REPORT_KEYS as readonly string[]).includes(value);
}

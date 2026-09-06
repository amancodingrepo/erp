export const REPORT_KEYS = [
  "students",
  "daily-collection",
  "head-collection",
  "dues",
  "attendance-register",
  "attendance-percent",
  "exam-results",
  "user-log",
  "payment-log",
  "audit",
  "staff",
  "disabled-students",
] as const;

export type ReportKey = (typeof REPORT_KEYS)[number];

export function isReportKey(value: string): value is ReportKey {
  return (REPORT_KEYS as readonly string[]).includes(value);
}

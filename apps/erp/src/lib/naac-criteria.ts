export const NAAC_CRITERIA = [
  { number: 1, title: "Curricular Aspects" },
  { number: 2, title: "Teaching-Learning and Evaluation" },
  { number: 3, title: "Research, Innovations and Extension" },
  { number: 4, title: "Infrastructure and Learning Resources" },
  { number: 5, title: "Student Support and Progression" },
  { number: 6, title: "Governance, Leadership and Management" },
  { number: 7, title: "Institutional Values and Best Practices" },
] as const;

export function criterionCompletionPercent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

export function safeEvidenceUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return null;
  }
  return trimmed;
}

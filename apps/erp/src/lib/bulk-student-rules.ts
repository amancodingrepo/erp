/** Shared rules for the Excel student bulk upload. Keep the checks in
 * apps/school-world/src/pages/Students/bulkStudentImport.js in step with this file.
 */

export type AcademicYearSpan = { start: number; end: number };

export function academicYearSpan(label: string): AcademicYearSpan | null {
  const text = label.trim().replace(/[–—]/g, "-").replace(/\s+/g, "").replace(/\//g, "-");
  let match = text.match(/^(\d{4})-(\d{4})$/);
  if (match) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (end === start + 1) return { start, end };
    return null;
  }
  match = text.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const start = Number(match[1]);
  let end = Math.floor(start / 100) * 100 + Number(match[2]);
  if (end < start) end += 100;
  if (end !== start + 1) return null;
  return { start, end };
}

export function resolveAcademicYearName(
  incoming: string,
  sessions: Array<{ name: string }>,
  currentName?: string | null,
): { name: string; matchedExisting: boolean; ambiguous: string[] } {
  const label = incoming.trim().replace(/\s+/g, " ");
  const span = academicYearSpan(label);
  if (!span) {
    const exact = sessions.find((session) => session.name === label);
    if (exact) return { name: exact.name, matchedExisting: true, ambiguous: [] };
    return { name: label, matchedExisting: false, ambiguous: [] };
  }
  const matches = sessions.filter((session) => {
    const other = academicYearSpan(session.name);
    return other?.start === span.start && other.end === span.end;
  });
  if (matches.length === 0) return { name: label, matchedExisting: false, ambiguous: [] };
  if (matches.length === 1) return { name: matches[0].name, matchedExisting: true, ambiguous: [] };
  const names = matches.map((session) => session.name);
  if (currentName && names.includes(currentName)) {
    return { name: currentName, matchedExisting: true, ambiguous: [] };
  }
  return { name: label, matchedExisting: false, ambiguous: names };
}

/** Exactly 10 digits. Spaces and dashes are ignored. A country code is not accepted. */
export function tenDigitMobile(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{10}$/.test(digits) ? digits : null;
}

/** Key for comparing a stored phone, including a leading 0 or 91 already in the database. */
export function storedMobileKey(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (/^\d{10}$/.test(digits)) return digits;
  if (/^0\d{10}$/.test(digits)) return digits.slice(1);
  if (/^91\d{10}$/.test(digits)) return digits.slice(2);
  return null;
}

/** One parent contact number may belong to at most this many students. */
export const MAX_PARENT_PHONE_USES = 3;

export function parentPhoneOveruseMessage(
  mobile: string,
  existingCount: number,
  earlierExcelRows: number[],
): string {
  const details: string[] = [];
  if (existingCount > 0) {
    details.push(`It is already used by ${existingCount} student${existingCount === 1 ? "" : "s"}.`);
  }
  if (earlierExcelRows.length > 0) {
    const label = earlierExcelRows.length === 1 ? "Excel row" : "Excel rows";
    details.push(`It also appears on ${label} ${earlierExcelRows.join(", ")}.`);
  }
  const detail = details.length ? ` ${details.join(" ")}` : "";
  return `Parent Phone ${mobile} cannot be used more than ${MAX_PARENT_PHONE_USES} times.${detail}`;
}

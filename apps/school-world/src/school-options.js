// The signed-in school's own academic years and classes.
//
// main.jsx fills window.SCHOOL_DIARY_CONFIG from GET /api/bootstrap: the school's sessions
// (academicYears, currentAcademicYear) and its classes. Screens read them from here instead of
// carrying a fixed year such as "2026-2027" or a class such as "PRE NURSERY A".

function config() {
  if (typeof window === "undefined") return {};
  return window.SCHOOL_DIARY_CONFIG || window.__SCHOOL_DIARY_CONFIG__ || {};
}

const clean = (value) => String(value ?? "").trim();
const unique = (values) => [...new Set(values.map(clean).filter(Boolean))];
const byYearDesc = (a, b) => b.localeCompare(a, undefined, { numeric: true });

/** The year the school marked as current in its sessions, or "" when none is set. */
export function currentAcademicYear(source = config()) {
  return clean(source.currentAcademicYear);
}

/** The school's years, newest first, plus any extra values already on a record (so they still show). */
export function academicYearOptions(...extra) {
  const source = config();
  const years = Array.isArray(source.academicYears) ? source.academicYears : [];
  return unique([...years, ...extra.flat()]).sort(byYearDesc);
}

/** The school's classes in its own order, plus any extra values already on a record. */
export function classOptions(...extra) {
  const source = config();
  const classes = Array.isArray(source.classes) ? source.classes : [];
  return unique([...classes.map((item) => (typeof item === "string" ? item : item?.className || item?.class_name || item?.name)), ...extra.flat()]);
}

/** Year to start a new record with: the record's own, else the school's current year, else none. */
export function defaultAcademicYear(...preferred) {
  return clean(preferred.find((value) => clean(value))) || currentAcademicYear();
}

/** Shape main.jsx stores from GET /api/bootstrap. */
export function optionsFromBootstrap(bootstrap) {
  const years = Array.isArray(bootstrap?.academicYears) ? bootstrap.academicYears : [];
  const classes = Array.isArray(bootstrap?.classes) ? bootstrap.classes : [];
  return {
    academicYears: unique(years.map((year) => year?.label || year?.name)),
    currentAcademicYear: clean(years.find((year) => year?.isCurrent || year?.is_current)?.label),
    classes: unique(classes.map((item) => item?.class_name || item?.className || item?.name)),
  };
}

/**
 * The school's current year, or — when it has not marked one yet — the year that contains `date`,
 * assuming an April start (the usual Indian school year). Prefer currentAcademicYear() for new
 * records; this is for screens that must always show some year.
 */
export function academicYearNow(date = new Date()) {
  const own = currentAcademicYear();
  if (own) return own;
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

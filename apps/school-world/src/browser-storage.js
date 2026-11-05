// What School World keeps in browser storage, and what it must not.
//
// School records (students, their details, names) come only from the school's database.
// Earlier versions copied them into browser storage, which every person on the computer shares;
// those keys are removed on load. The only thing kept is the last page and filters, separately
// for each person in each school.

export const LEGACY_STORAGE_KEYS = [
  "schoolDiaryCorrectedV4.students.uploadedData20261014",
  "schoolDiaryCorrectedV4.detailsByStudentId.uploadedData20261014",
  "schoolWorld.lastVisitedPage.v1",
  "schoolDiary.activeSchoolName",
  "schoolDiary.activeSchool",
  "schoolDiary.activeAccount",
  "schoolDiary.tenantConfig",
];

export function clearLegacyStorage(storage = globalThis.localStorage) {
  for (const key of LEGACY_STORAGE_KEYS) {
    try { storage?.removeItem(key); } catch { /* storage may be blocked */ }
  }
}

const NAVIGATION_STORAGE_PREFIX = "schoolWorld.lastVisitedPage.v2";

/** One key per school and person, so the next person on a shared computer doesn't open someone else's view. */
export function navigationStorageKey(user) {
  if (!user?.id || !user?.school?.id) return "";
  return `${NAVIGATION_STORAGE_PREFIX}:${user.school.id}:${user.id}`;
}

export function readStoredNavigation(user, storage = globalThis.localStorage) {
  const key = navigationStorageKey(user);
  if (!key) return null;
  try {
    const raw = storage?.getItem(key);
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}

export function saveStoredNavigation(user, value, storage = globalThis.localStorage) {
  const key = navigationStorageKey(user);
  if (!key) return;
  try { storage?.setItem(key, JSON.stringify(value)); }
  catch (error) { console.warn("Could not save the last visited page.", error); }
}

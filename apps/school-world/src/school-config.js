import { useEffect, useState } from "react";

export const SCHOOL_NAME_STORAGE_KEY = "schoolDiary.activeSchoolName";
const SCHOOL_NAME_EVENT = "schooldiary:tenant-updated";
// No built-in school: the name always comes from the signed-in school (tenant).
const DEFAULT_SCHOOL_NAME = "";

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function extractSchoolName(value) {
  if (typeof value === "string") {
    const simple = nonEmpty(value);
    if (simple) return simple;
    return "";
  }
  if (!value || typeof value !== "object") return "";
  return nonEmpty(value.schoolName)
    || nonEmpty(value.school_name)
    || nonEmpty(value.name)
    || nonEmpty(value.school?.schoolName)
    || nonEmpty(value.school?.name)
    || nonEmpty(value.tenant?.schoolName)
    || nonEmpty(value.tenant?.name)
    || nonEmpty(value.account?.schoolName)
    || nonEmpty(value.account?.school?.name);
}

function readStoredName(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return "";
    try {
      return extractSchoolName(JSON.parse(raw)) || nonEmpty(raw);
    } catch {
      return nonEmpty(raw);
    }
  } catch {
    return "";
  }
}

/**
 * Resolve the active tenant's display name.
 * Production integrations should populate window.SCHOOL_DIARY_CONFIG from the
 * authenticated account/tenant response. Local storage and Vite env are useful
 * fallbacks for this standalone prototype.
 */
export function getSchoolName() {
  if (typeof window !== "undefined") {
    const runtimeName = extractSchoolName(window.SCHOOL_DIARY_CONFIG)
      || extractSchoolName(window.__SCHOOL_DIARY_CONFIG__)
      || extractSchoolName(window.SCHOOL_DIARY_TENANT);
    if (runtimeName) return runtimeName;

    const storedName = readStoredName(SCHOOL_NAME_STORAGE_KEY)
      || readStoredName("schoolDiary.activeSchool")
      || readStoredName("schoolDiary.activeAccount")
      || readStoredName("schoolDiary.tenantConfig");
    if (storedName) return storedName;
  }

  const configuredBuildName = nonEmpty(import.meta.env?.VITE_SCHOOL_NAME);
  return configuredBuildName || DEFAULT_SCHOOL_NAME;
}

export function useSchoolName() {
  const [schoolName, setSchoolName] = useState(() => getSchoolName());

  useEffect(() => {
    const refresh = () => setSchoolName(getSchoolName());
    window.addEventListener("storage", refresh);
    window.addEventListener(SCHOOL_NAME_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(SCHOOL_NAME_EVENT, refresh);
    };
  }, []);

  return schoolName;
}

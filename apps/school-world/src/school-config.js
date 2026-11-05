import { useEffect, useState } from "react";

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

/**
 * The signed-in school's display name, from the session (DatabaseSession sets
 * window.SCHOOL_DIARY_CONFIG from the school's own record). There is deliberately no
 * browser-storage or build-time fallback: on a multi-tenant platform those could show
 * another school's name.
 */
export function getSchoolName() {
  if (typeof window !== "undefined") {
    const runtimeName = extractSchoolName(window.SCHOOL_DIARY_CONFIG)
      || extractSchoolName(window.__SCHOOL_DIARY_CONFIG__)
      || extractSchoolName(window.SCHOOL_DIARY_TENANT);
    if (runtimeName) return runtimeName;
  }
  return DEFAULT_SCHOOL_NAME;
}

export function useSchoolName() {
  const [schoolName, setSchoolName] = useState(() => getSchoolName());

  useEffect(() => {
    const refresh = () => setSchoolName(getSchoolName());
    window.addEventListener(SCHOOL_NAME_EVENT, refresh);
    return () => {
      window.removeEventListener(SCHOOL_NAME_EVENT, refresh);
    };
  }, []);

  return schoolName;
}

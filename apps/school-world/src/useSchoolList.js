import { useEffect, useState } from "react";
import { apiGet } from "./api.js";

// The school's own option lists (student categories, staff categories, leave types), loaded once
// per page view from the school's records instead of a built-in list.

export const SCHOOL_LISTS = {
  studentCategories: { path: "/v1/categories", pick: (body) => body?.data },
  staffCategories: { path: "/staff-categories", pick: (body) => (body?.categories || []).filter((row) => row?.isActive !== false) },
  leaveTypes: { path: "/v1/leave-types", pick: (body) => body?.data },
};

const cache = new Map();

/** Unique, trimmed names from a list response, in the school's order. */
export function listNames(rows) {
  return [...new Set((Array.isArray(rows) ? rows : []).map((row) => String(row?.name ?? "").trim()).filter(Boolean))];
}

export function loadSchoolList(kind) {
  const list = SCHOOL_LISTS[kind];
  if (!list) return Promise.resolve([]);
  if (!cache.has(kind)) {
    cache.set(kind, apiGet(list.path).then((body) => listNames(list.pick(body))).catch((error) => {
      cache.delete(kind); // try again next time
      throw error;
    }));
  }
  return cache.get(kind);
}

/** [names, { loaded, error }] for one of SCHOOL_LISTS. */
export function useSchoolList(kind) {
  const [state, setState] = useState({ names: [], loaded: false, error: "" });
  useEffect(() => {
    let alive = true;
    loadSchoolList(kind)
      .then((names) => { if (alive) setState({ names, loaded: true, error: "" }); })
      .catch((error) => { if (alive) setState({ names: [], loaded: true, error: error?.message || "Could not load the list." }); });
    return () => { alive = false; };
  }, [kind]);
  return [state.names, state];
}

/** Options for a select: the school's names, plus the record's current value if it isn't one of them. */
export function withCurrent(names, current) {
  const value = String(current ?? "").trim();
  return value && !names.includes(value) ? [value, ...names] : names;
}

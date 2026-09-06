"use client";

import { useCallback, useEffect, useState } from "react";

export type PortalData = {
  student: { id: string; admissionNo: string; name: string; class: string | null; section: string | null };
  dues: { balance: string; paid: string; total: string };
  attendancePercent: number;
  notices: Array<{ id: string; title: string; publishAt: string }>;
  timetable: { placeholder: boolean; nextClass: string | null };
  exams: { status: string; marks: Array<{ exam: string; marks: unknown; isAbsent?: boolean }> };
};

export function usePortal() {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const childId =
      typeof window !== "undefined" ? sessionStorage.getItem("parentChildId") : null;
    const qs = childId ? `?studentId=${childId}` : "";
    const res = await fetch(`/api/v1/portal/dashboard${qs}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? json.error ?? "Could not load");
      return;
    }
    setData(json);
  }, []);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("parent-child-change", onChange);
    return () => window.removeEventListener("parent-child-change", onChange);
  }, [load]);

  return { data, error, reload: load };
}

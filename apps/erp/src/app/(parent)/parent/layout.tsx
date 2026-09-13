"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";

const LINKS = [
  { href: "/parent/dashboard", label: "Home" },
  { href: "/parent/profile", label: "Profile" },
  { href: "/parent/fees", label: "Fees" },
  { href: "/parent/attendance", label: "Attendance" },
  { href: "/parent/exams", label: "Exams" },
  { href: "/parent/notices", label: "Notices" },
];

export default function ParentLayout({ children }: { children: ReactNode }) {
  const [childrenList, setChildrenList] = useState<Array<{ id: string; name: string }>>([]);
  const [childId, setChildId] = useState("");

  useEffect(() => {
    fetch("/api/v1/portal/dashboard")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.children ?? []).map((c: { id: string; firstName: string; lastName?: string }) => ({
          id: c.id,
          name: [c.firstName, c.lastName].filter(Boolean).join(" "),
        }));
        setChildrenList(list);
        const stored = sessionStorage.getItem("parentChildId");
        const initial = list.find((c: { id: string }) => c.id === stored)?.id ?? list[0]?.id ?? "";
        setChildId(initial);
      });
  }, []);

  return (
    <PortalShell
      title="Parent desk"
      home="/parent/dashboard"
      links={LINKS}
      extra={
        childrenList.length ? (
          <select
            className="h-9 rounded-md border border-white/20 bg-white/10 px-3 text-sm text-[var(--paper)]"
            value={childId}
            onChange={(e) => {
              setChildId(e.target.value);
              sessionStorage.setItem("parentChildId", e.target.value);
              window.dispatchEvent(new Event("parent-child-change"));
            }}
          >
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : null
      }
    >
      {children}
    </PortalShell>
  );
}

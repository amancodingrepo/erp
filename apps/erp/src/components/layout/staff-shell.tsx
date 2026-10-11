"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NAV, type NavItem } from "@/lib/catalog/nav";
import {
  filterNav,
  isTeacherDesk,
  screenIsVisible,
  teacherCanSeeHref,
} from "@/lib/catalog/nav-permissions";
import { SCREENS } from "@/lib/catalog/screens";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { LanguageToggle, useI18n } from "@/lib/i18n/provider";
import type { AuthPrincipal } from "@/lib/permissions";

type Me = {
  user: AuthPrincipal;
  campus: { name: string; code?: string | null; session: { name: string } | null };
  modules: Record<string, boolean>;
};

type TenantRow = { id: string; name: string; code: string | null };
type Membership = {
  userId: string;
  actorType: string;
  campusName: string;
  campusCode: string | null;
  current: boolean;
};
type SessionOption = { id: string; name: string; isCurrent?: boolean };

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [me, setMe] = useState<Me | null>(null);
  const [q, setQ] = useState("");
  const [palette, setPalette] = useState(false);
  const [dataHits, setDataHits] = useState<{
    students: Array<{ id: string; admissionNo: string; name: string; href: string }>;
    receipts: Array<{ receiptNo: string; student: string; href: string }>;
  }>({ students: [], receipts: [] });
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [viewingSessionId, setViewingSessionId] = useState<string>("");

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.user) setMe(data as Me);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    fetch("/api/v1/auth/memberships")
      .then((r) => r.json())
      .then((json) => setMemberships(json.data ?? []))
      .catch(() => setMemberships([]));
  }, [me?.user.id]);

  useEffect(() => {
    if (!me?.user.id) return;
    fetch("/api/v1/sessions/context")
      .then((r) => r.json())
      .then((json) => {
        setSessions(json.data ?? []);
        setViewingSessionId(json.viewingSessionId ?? json.currentSessionId ?? "");
      })
      .catch(() => {
        setSessions([]);
        setViewingSessionId("");
      });
  }, [me?.user.id, me?.user.campusId]);

  useEffect(() => {
    if (!me?.user.roles.includes("PlatformAdmin")) return;
    fetch("/api/v1/tenants")
      .then((r) => r.json())
      .then((json) => setTenants(json.data ?? []))
      .catch(() => setTenants([]));
  }, [me]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((v) => !v);
      }
      if (event.key === "Escape") setPalette(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = useMemo(() => {
    const gated = filterNav(NAV, me?.user, me?.modules ?? {}).map((g) => {
      const extra: NavItem[] = [];
      function add(label: string, href: string, module: string) {
        if (!g.items.some((item) => item.href === href)) {
          extra.push({ label, href, source: "", module });
        }
      }
      if (g.label === "Communicate") {
        add("Requests", "/staff/messages", "communicate");
        add("Campus events", "/staff/events", "communicate");
        add("One-way communication", "/staff/one-way", "communicate");
        add("Student diary", "/staff/diary", "communicate");
        add("Emergency SMS", "/staff/emergency-sms", "communicate");
      }
      if (g.label === "Student Information") {
        add("Search users", "/staff/search-users", "students");
        add("Contacts", "/staff/contacts", "students");
        add("Daycare", "/staff/daycare", "students");
        add("Admission forms", "/staff/admission-forms", "admission");
        add("Admission tests", "/staff/admission-tests", "admission");
        add("Change house", "/staff/change-house", "students");
        add("Bulk photos", "/staff/bulk-photos", "students");
        add("Corporates", "/staff/corporates", "students");
        add("Birthdays", "/staff/birthdays", "students");
        add("Class eligibility", "/staff/eligibility", "students");
      }
      if (g.label === "Attendance") {
        add("Attendance dashboard", "/staff/attendance-dashboard", "attendance");
        add("Attendance modes", "/staff/attendance-modes", "attendance");
      }
      if (g.label === "Academics") {
        add("Class teachers", "/staff/teacher/assign-class-teacher", "academics");
        add("Questionnaires", "/staff/questionnaires", "academics");
        add("Report templates", "/staff/performance-templates", "exams");
        add("Performance report", "/staff/student-performance", "exams");
        add("Principal details", "/staff/principals", "academics");
        add("Subject categories", "/staff/subject-categories", "academics");
        add("Subject types", "/staff/subject-types", "academics");
        add("Leave marks percent", "/staff/leave-marks-percent", "exams");
        add("EYFS", "/staff/eyfs", "academics");
      }
      if (g.label === "Human Resource") {
        add("Staff categories", "/staff/staff-categories", "hr");
        add("Drivers", "/staff/driver", "hr");
      }
      if (g.label === "Fees Collection") {
        add("Bulk fee upload", "/staff/fees-upload", "fees");
        add("Bulk pay", "/staff/fees-bulk-pay", "fees");
        add("Deposit slips", "/staff/deposit-slips", "fees");
      }
      if (g.label === "Transport") {
        add("Bus location", "/staff/gps", "transport");
        add("Pickup authorisation", "/staff/pickup-auth", "transport");
        add("Fuel log", "/staff/transport/fuel", "transport");
        add("Fee slabs", "/staff/transport/slabs", "transport");
      }
      if (g.label === "Library") {
        add("Book centers", "/staff/library/centers", "library");
      }
      if (g.label === "Front Office") {
        add("CCTV cameras", "/staff/cctv", "front-office");
        add("External links", "/staff/links", "front-office");
        add("School website", "/staff/website", "front-office");
      }
      if (!extra.length) return g;
      return { ...g, items: [...extra, ...g.items] };
    });
    const needle = q.trim().toLowerCase();
    if (!needle) return gated;
    return gated
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (item) =>
            item.label.toLowerCase().includes(needle) ||
            item.href.toLowerCase().includes(needle),
        ),
      }))
      .filter((g) => g.items.length);
  }, [q, me]);

  const hits = useMemo(() => {
    const visible = SCREENS.filter((s) =>
      screenIsVisible(s, me?.user, me?.modules ?? {}),
    );
    const needle = q.trim().toLowerCase();
    if (!needle) return visible.slice(0, 12);
    return visible
      .filter(
        (s) =>
          s.title.toLowerCase().includes(needle) ||
          s.module.includes(needle) ||
          s.route.includes(needle),
      )
      .slice(0, 20);
  }, [q, me]);

  useEffect(() => {
    const needle = q.trim();
    if (!palette || needle.length < 2) {
      setDataHits({ students: [], receipts: [] });
      return;
    }
    const handle = window.setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(needle)}`)
        .then((r) => r.json())
        .then((json) =>
          setDataHits({
            students: json.students ?? [],
            receipts: isTeacherDesk(me?.user) ? [] : json.receipts ?? [],
          }),
        )
        .catch(() => setDataHits({ students: [], receipts: [] }));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [q, palette, me]);

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  async function switchMembership(userId: string) {
    if (!userId || userId === me?.user.id) return;
    const res = await fetch("/api/v1/auth/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ membership_id: userId }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) window.location.assign(json.home ?? "/staff/dashboard");
  }

  async function switchCampus(campusId: string) {
    if (!campusId || campusId === me?.user.campusId) return;
    const res = await fetch("/api/v1/auth/switch-campus", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campusId }),
    });
    if (res.ok) window.location.assign("/staff/dashboard");
  }

  async function switchSession(sessionId: string) {
    if (!sessionId || sessionId === viewingSessionId) return;
    const res = await fetch("/api/v1/sessions/context", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) window.location.reload();
  }

  return (
    <div className="min-h-dvh px-3 py-4 sm:px-5">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-[1440px] grid-cols-1 gap-4 rounded-[28px] bg-[#f4f5f7] p-3 shadow-[0_30px_80px_rgba(20,30,20,0.08)] lg:grid-cols-[248px_1fr]">
      <aside className="flex flex-col rounded-3xl bg-white p-4 shadow-[var(--shadow)]">
        <div className="mb-4 flex items-center gap-2.5 px-1">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[linear-gradient(135deg,#2d8f5b,#1e6b44)] text-sm font-extrabold text-white shadow-[0_6px_14px_rgba(30,107,68,0.28)]">
            C
          </span>
          <div>
            <p className="text-[18px] font-bold leading-none tracking-tight">
              {isTeacherDesk(me?.user) ? t("Teacher") : t("Campus")}
            </p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              {me?.campus.name ?? "Campus"}
              {me?.campus.code ? ` · ${me.campus.code}` : ""}
            </p>
          </div>
        </div>
          {memberships.length > 1 ? (
            <label className="mb-3 block">
              <span className="sr-only">{t("Membership")}</span>
              <select
                value={me?.user.id ?? ""}
                onChange={(e) => switchMembership(e.target.value)}
                className="h-9 w-full text-xs"
              >
                {memberships.map((row) => (
                  <option key={row.userId} value={row.userId}>
                    {row.actorType} · {row.campusName}
                    {row.campusCode ? ` (${row.campusCode})` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {tenants.length > 1 ? (
            <label className="mb-3 block">
              <span className="sr-only">Switch campus</span>
              <select
                value={me?.user.campusId ?? ""}
                onChange={(e) => switchCampus(e.target.value)}
                className="h-9 w-full text-xs"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.code ? ` (${t.code})` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="mb-3 block">
            <span className="sr-only">Filter menu</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Search menu")}
              className="h-10 w-full rounded-full border border-[var(--rule)] bg-[#f7f7f8] px-4 text-sm"
            />
          </label>
        <nav className="flex-1 overflow-y-auto pb-4">
          {groups.map((group) => {
            const open = group.items.some(
              (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
            );
            return (
              <details
                key={group.label}
                open={open || Boolean(q)}
                className="mb-1"
              >
                <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-[12px] font-semibold text-[var(--muted)] hover:bg-[#f7f7f8]">
                  {t(group.label)}
                  <span className="ml-2 text-[var(--text-3,#9aa0a6)]">{group.items.length}</span>
                </summary>
                <div className="mb-2 flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      className={cn(
                        "rounded-xl px-3 py-2 text-[13.5px] font-medium leading-snug",
                        pathname === item.href
                          ? "bg-[var(--peach)] font-semibold text-[var(--brass)]"
                          : "text-[#5f6368] hover:bg-[#f7f7f8] hover:text-[#222]",
                      )}
                    >
                      {t(item.label)}
                    </Link>
                  ))}
                </div>
              </details>
            );
          })}
        </nav>
        <div className="mt-auto rounded-[18px] bg-[linear-gradient(160deg,#8aa15a_0%,#3d6b3e_55%,#2b5533_100%)] p-4 text-white shadow-[0_10px_24px_rgba(45,85,50,0.22)]">
          {sessions.length > 0 ? (
            <label className="block">
              <span className="sr-only">{t("Academic year")}</span>
              <select
                value={viewingSessionId}
                onChange={(e) => switchSession(e.target.value)}
                className="h-9 w-full rounded-md border-0 bg-white/15 px-2 text-[12px] font-medium text-white"
              >
                {sessions.map((row) => (
                  <option key={row.id} value={row.id} className="text-[#1f2937]">
                    {row.name}
                    {row.isCurrent ? ` · ${t("current")}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-[12px] font-medium opacity-90">
              {me?.campus.session?.name ?? t("Session")}
            </p>
          )}
          <p className="mt-1 text-[13px] font-semibold">{me?.user.roles.join(", ") || "Staff"}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#1f2937]"
          >
            {t("Sign out")}
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col px-1 pb-1 lg:px-2">
        <header className="flex flex-wrap items-center justify-between gap-3 px-1 py-2">
          <button
            type="button"
            className="flex h-11 max-w-md flex-1 items-center rounded-full border border-[var(--rule)] bg-white px-4 text-sm text-[var(--muted)] shadow-[0_1px_0_rgba(0,0,0,0.02)]"
            onClick={() => setPalette(true)}
          >
            {t("Search students, receipts, screens · Ctrl+K")}
          </button>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <span className="hidden rounded-full border border-[var(--rule)] bg-white px-3 py-2 text-xs font-semibold sm:inline">
              {t(me?.user.roles[0] ?? "Staff")}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={logout}>
              {t("Sign out")}
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-1 py-3">
          {me && isTeacherDesk(me.user) && !teacherCanSeeHref(pathname) ? (
            <div className="em-card max-w-lg p-6">
              <h1 className="font-display text-3xl">{t("Not on the teacher desk")}</h1>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {t(
                  "This screen is for office staff. Use attendance, marks, timetable, homework, or student search.",
                )}
              </p>
              <Link
                href="/staff/dashboard"
                className="mt-4 inline-block text-sm font-semibold text-[var(--green-dark)]"
              >
                {t("Back to teacher home")}
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      </div>
      {palette ? (
        <div
          className="fixed inset-0 z-50 bg-black/30 p-4"
          onClick={() => setPalette(false)}
        >
          <div
            className="em-card mx-auto mt-[10vh] max-w-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[12.5px] font-semibold text-[var(--brass)]">
              Jump to student, receipt, or screen
            </p>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, admission no, receipt no, screen…"
              className="mt-3 h-11 w-full rounded-full border border-[var(--rule)] bg-white px-4"
            />
            <ul className="mt-3 max-h-80 overflow-y-auto text-sm">
              {dataHits.students.map((s) => (
                <li key={s.id}>
                  <Link
                    href={s.href}
                    className="block px-2 py-2 hover:bg-[var(--paper-2)]"
                    onClick={() => setPalette(false)}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 text-[var(--muted)]">
                      {s.admissionNo} · student
                    </span>
                  </Link>
                </li>
              ))}
              {dataHits.receipts.map((r) => (
                <li key={r.receiptNo}>
                  <Link
                    href={r.href}
                    className="block px-2 py-2 hover:bg-[var(--paper-2)]"
                    onClick={() => setPalette(false)}
                  >
                    <span className="font-medium">{r.receiptNo}</span>
                    <span className="ml-2 text-[var(--muted)]">
                      {r.student} · receipt
                    </span>
                  </Link>
                </li>
              ))}
              {hits.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="block px-2 py-2 hover:bg-[var(--paper-2)]"
                    onClick={() => setPalette(false)}
                  >
                    <span className="font-medium">{s.title}</span>
                    <span className="ml-2 text-[var(--muted)]">
                      {s.module}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

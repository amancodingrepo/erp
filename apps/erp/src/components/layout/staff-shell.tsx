"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NAV } from "@/lib/catalog/nav";
import { filterNav, screenIsVisible } from "@/lib/catalog/nav-permissions";
import { SCREEN_COUNT, SCREENS } from "@/lib/catalog/screens";
import { cn } from "@/lib/cn";
import type { AuthPrincipal } from "@/lib/permissions";

type Me = {
  user: AuthPrincipal;
  campus: { name: string; session: { name: string } | null };
  modules: Record<string, boolean>;
};

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [q, setQ] = useState("");
  const [palette, setPalette] = useState(false);
  const [dataHits, setDataHits] = useState<{
    students: Array<{ id: string; admissionNo: string; name: string; href: string }>;
    receipts: Array<{ receiptNo: string; student: string; href: string }>;
  }>({ students: [], receipts: [] });

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
    const gated = filterNav(NAV, me?.user, me?.modules ?? {});
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
            receipts: json.receipts ?? [],
          }),
        )
        .catch(() => setDataHits({ students: [], receipts: [] }));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [q, palette]);

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="flex min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <aside className="flex w-[18.5rem] shrink-0 flex-col border-r border-[var(--rule)] bg-[var(--ink)] text-[var(--paper)]">
        <div className="border-b border-white/10 px-4 py-5">
          <p className="font-display text-xl leading-none tracking-tight">
            College ERP
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--brass)]">
            {me?.campus.name ?? "Campus"} · {SCREEN_COUNT} screens
          </p>
          <label className="mt-4 block">
            <span className="sr-only">Filter menu</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter menu"
              className="h-9 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-[var(--paper)] placeholder:text-white/40"
            />
          </label>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 pb-8">
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
                <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brass)] hover:bg-white/5">
                  {group.label}
                  <span className="ml-2 text-white/40">{group.items.length}</span>
                </summary>
                <div className="mb-2 ml-1 flex flex-col gap-0.5 border-l border-white/10 pl-2">
                  {group.items.map((item) => (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-[13px] leading-snug",
                        pathname === item.href
                          ? "bg-[var(--brass)] text-[var(--ink)]"
                          : "text-[var(--paper)]/80 hover:bg-white/5",
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </details>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs">
          <p className="text-[var(--paper)]/70">
            {me?.campus.session?.name ?? "Session"}
          </p>
          <p className="mt-1 font-medium">{me?.user.roles.join(", ")}</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-[var(--rule)] bg-[var(--paper-2)] px-6">
          <button
            type="button"
            className="text-sm text-[var(--muted)]"
            onClick={() => setPalette(true)}
          >
            Staff desk · Ctrl+K to jump screens
          </button>
          <button
            type="button"
            onClick={logout}
            className="text-sm underline-offset-4 hover:underline"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      {palette ? (
        <div
          className="fixed inset-0 z-50 bg-[var(--ink)]/40 p-4"
          onClick={() => setPalette(false)}
        >
          <div
            className="mx-auto mt-[10vh] max-w-xl border border-[var(--rule)] bg-[var(--paper)] p-4 shadow-[8px_8px_0_#1b2a22]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--brass)]">
              Jump to student, receipt, or screen
            </p>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, admission no, receipt no, screen…"
              className="mt-3 h-11 w-full rounded-md border border-[var(--rule)] bg-[var(--paper-2)] px-3"
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

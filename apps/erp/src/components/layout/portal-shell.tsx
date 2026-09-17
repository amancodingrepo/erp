"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function PortalShell({
  title,
  home,
  links,
  extra,
  children,
}: {
  title: string;
  home: string;
  links: Array<{ href: string; label: string }>;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh px-3 py-4 sm:px-5">
      <div className="mx-auto max-w-5xl rounded-[28px] bg-[#f4f5f7] p-3 shadow-[0_30px_80px_rgba(20,30,20,0.08)]">
      <header className="rounded-3xl bg-white p-4 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[linear-gradient(135deg,#2d8f5b,#1e6b44)] text-sm font-extrabold text-white">
              C
            </span>
            <div>
              <p className="text-[11px] font-semibold text-[var(--green-dark)]">Campus ERP</p>
              <Link href={home} className="text-xl font-bold leading-tight tracking-tight">
                {title}
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {extra}
            <Button type="button" variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
        <nav className="mt-3 flex flex-wrap gap-1">
          {links.map((l) => {
            const active = path === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active
                    ? "rounded-full bg-[var(--peach)] px-3 py-1.5 text-sm font-semibold text-[var(--brass)]"
                    : "rounded-full px-3 py-1.5 text-sm text-[#5f6368] hover:bg-[#f7f7f8]"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="px-2 py-6 sm:px-4">{children}</main>
      </div>
    </div>
  );
}

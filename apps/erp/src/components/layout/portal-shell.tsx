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
    <div className="min-h-dvh bg-[var(--paper)]">
      <header className="border-b border-[var(--rule)] bg-[var(--ink)] text-[var(--paper)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brass)]">
              College ERP
            </p>
            <Link href={home} className="font-display text-2xl leading-tight">
              {title}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {extra}
            <Button type="button" variant="brass" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-1 px-4 pb-3 sm:px-6">
          {links.map((l) => {
            const active = path === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active
                    ? "rounded-full bg-[var(--brass)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)]"
                    : "rounded-full px-3 py-1.5 text-sm text-[var(--paper)]/80 hover:bg-white/10"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

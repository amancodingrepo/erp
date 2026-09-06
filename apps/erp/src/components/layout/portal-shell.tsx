"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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
  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--rule)] bg-[var(--paper-2)] px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={home} className="font-display text-2xl">
            {title}
          </Link>
          {extra}
        </div>
        <nav className="mt-3 flex flex-wrap gap-3 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={path === l.href ? "font-semibold text-[var(--brass)]" : "underline"}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}

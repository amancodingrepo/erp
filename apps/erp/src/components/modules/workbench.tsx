"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { screenByHref } from "@/lib/catalog/lookup";
import type { FieldDef, ScreenDef } from "@/lib/catalog/screens";
import { SpecialScreen } from "./special-screens";
import PhaseBScreen from "./phase-b";

type RecordRow = {
  id: string;
  title: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

function synthetic(href: string): ScreenDef {
  const route = href.replace(/^\/staff/, "") || "/";
  const title = route.split("/").filter(Boolean).slice(-1)[0]?.replaceAll("-", " ") ?? "Screen";
  return {
    module: "system",
    priority: "core",
    title: title.replace(/\b\w/g, (c) => c.toUpperCase()),
    route,
    source: "",
    href,
    kind: "list",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "code", label: "Code", type: "text" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  };
}

export function Workbench({ href }: { href: string }) {
  const screen = useMemo(
    () => screenByHref(href) ?? synthetic(href),
    [href],
  );
  const live = SpecialScreen({ href, screen });
  if (live) return live;
  if (
    screen.module === "payroll" ||
    screen.module === "mentoring" ||
    href.startsWith("/staff/hr-recruitment") ||
    href.startsWith("/staff/staffpayroll")
  ) {
    return <PhaseBScreen title={screen.title} />;
  }
  return <GenericScreen screen={screen} />;
}

function GenericScreen({ screen }: { screen: ScreenDef }) {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(
      `/api/v1/records?screenKey=${encodeURIComponent(screen.href)}`,
    );
    const json = await res.json();
    setRows(json.data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.href]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const field of screen.fields) {
      payload[field.key] = form.get(field.key);
    }
    const title = String(
      payload.name ?? payload.admissionNo ?? payload.applicationNo ?? payload.employeeId ?? "Record",
    );
    const res = await fetch("/api/v1/records", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screenKey: screen.href, title, payload }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.message ?? json.error ?? "Could not save");
      return;
    }
    event.currentTarget.reset();
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/v1/records/${id}`, { method: "DELETE" });
    load();
  }

  const filtered = rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brass)]">
        {screen.module} · {screen.priority} · {screen.kind}
      </p>
      <h1 className="font-display mt-1 text-4xl capitalize">{screen.title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
        Rebuild of <code>{screen.source || screen.route}</code>. Session-scoped
        campus records. Filters and the register below persist for this screen.
      </p>

      {screen.kind === "dashboard" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Records" value={String(rows.length)} />
          <Stat label="Module" value={screen.module} />
          <Stat label="Kind" value={screen.kind} />
        </div>
      ) : null}

      <form
        className="mt-8 grid gap-3 border border-[var(--rule)] bg-[var(--paper-2)] p-4 sm:grid-cols-2"
        onSubmit={onSubmit}
      >
        {screen.fields.map((field) => (
          <Field key={field.key} field={field} />
        ))}
        {error ? (
          <p className="sm:col-span-2 text-sm text-[var(--stamp)]" role="alert">
            {error}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit">
            {screen.kind === "report" ? "Run / save result" : "Save"}
          </Button>
        </div>
      </form>

      <div className="mt-6 flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="q">Find in register</Label>
          <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p className="pb-2 text-sm text-[var(--muted)]">{filtered.length} rows</p>
      </div>

      <div className="mt-4 overflow-x-auto border border-[var(--rule)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[var(--ink)] text-[var(--paper)]">
            <tr>
              <th className="px-3 py-2">Title</th>
              {screen.fields.slice(0, 4).map((f) => (
                <th key={f.key} className="px-3 py-2">
                  {f.label}
                </th>
              ))}
              <th className="px-3 py-2"> </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="odd:bg-[var(--paper-2)]">
                <td className="px-3 py-2">{row.title}</td>
                {screen.fields.slice(0, 4).map((f) => (
                  <td key={f.key} className="px-3 py-2">
                    {String(row.payload?.[f.key] ?? "—")}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <Button size="sm" variant="ghost" onClick={() => remove(row.id)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[var(--muted)]"
                  colSpan={6}
                >
                  Empty register. Save a row to start this screen.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="border border-[var(--rule)] bg-[var(--paper-2)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brass)]">
        {label}
      </p>
      <p className="font-display mt-2 text-2xl capitalize">{value}</p>
    </article>
  );
}

function Field({ field }: { field: FieldDef }) {
  if (field.type === "select") {
    return (
      <div>
        <Label htmlFor={field.key}>{field.label}</Label>
        <select
          id={field.key}
          name={field.key}
          className="h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div>
      <Label htmlFor={field.key}>{field.label}</Label>
      <Input
        id={field.key}
        name={field.key}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      />
    </div>
  );
}

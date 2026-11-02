"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ScreenDef } from "@/lib/catalog/screens";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function CatalogRecordOps({ screen }: { screen: ScreenDef }) {
  const [rows, setRows] = useState<
    Array<{ id: string; title: string; payload: Record<string, unknown> }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);

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
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    for (const field of screen.fields) {
      payload[field.key] = String(form.get(field.key) ?? "");
    }
    const title =
      payload.name ||
      payload.title ||
      payload.code ||
      `${screen.title} ${rows.length + 1}`;
    const res = await fetch("/api/v1/records", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        screenKey: screen.href,
        title,
        payload,
      }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    if (res.ok) event.currentTarget.reset();
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">{screen.title}</h1>
      <p className="text-sm text-[var(--muted)]">
        Campus register for this screen — not the full original workflow.
        Records stay on this campus only. {message}
      </p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        {screen.fields.slice(0, 8).map((field) => (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}</Label>
            {field.type === "select" ? (
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
            ) : (
              <Input
                id={field.key}
                name={field.key}
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
              />
            )}
          </div>
        ))}
        <Button type="submit">Save</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="border-b border-[var(--rule)] py-2">
            {row.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

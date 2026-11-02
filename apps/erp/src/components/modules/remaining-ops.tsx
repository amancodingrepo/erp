"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

const SELECT =
  "h-10 w-full rounded-xl border border-[var(--rule)] bg-white px-3 text-sm";

type Field = {
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  optionsPath?: string;
  optionLabel?: string;
};

export default function RemainingOps({
  title,
  collection,
  fields,
}: {
  title: string;
  collection: string;
  fields: Field[];
}) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [options, setOptions] = useState<Record<string, Array<{ id: string; name: string }>>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const { t } = useI18n();

  async function load() {
    const json = await fetch(`/api/v1/ops/${collection}`).then((r) => r.json());
    setRows(json.data ?? []);
  }

  useEffect(() => {
    load();
    for (const field of fields) {
      if (!field.optionsPath) continue;
      fetch(field.optionsPath)
        .then((r) => r.json())
        .then((j) => {
          const data = (j.data ?? []) as Array<Record<string, unknown>>;
          setOptions((prev) => ({
            ...prev,
            [field.name]: data.map((row) => ({
              id: String(row.id),
              name: String(
                row[field.optionLabel ?? "name"] ??
                  row.title ??
                  row.admissionNo ??
                  row.id,
              ),
            })),
          }));
        })
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = form.get(field.name);
      if (raw == null || raw === "") continue;
      body[field.name] =
        field.type === "number"
          ? Number(raw)
          : field.type === "checkbox"
            ? true
            : String(raw);
    }
    const res = await fetch(`/api/v1/ops/${collection}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setMessage(res.ok ? "Saved" : json.message ?? json.error ?? "Could not save");
    if (res.ok) event.currentTarget.reset();
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">{t(title)}</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        {fields.map((field) =>
          field.optionsPath ? (
            <select
              key={field.name}
              name={field.name}
              className={SELECT}
              required={field.required}
            >
              <option value="">{field.placeholder ?? field.name}</option>
              {(options[field.name] ?? []).map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          ) : (
            <Input
              key={field.name}
              name={field.name}
              placeholder={field.placeholder ?? field.name}
              type={field.type === "checkbox" ? "text" : field.type ?? "text"}
              required={field.required}
            />
          ),
        )}
        <Button type="submit">{t("Save")}</Button>
      </form>
      <ul className="text-sm">
        {rows.slice(0, 80).map((row) => (
          <li key={String(row.id)} className="border-b border-[var(--rule)] py-2">
            {String(
              row.title ??
                row.name ??
                row.code ??
                row.headline ??
                row.body ??
                row.id,
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChatOps() {
  return (
    <RemainingOps
      title="Chat"
      collection="chat-threads"
      fields={[
        { name: "title", placeholder: "Thread title" },
        { name: "body", placeholder: "Message", required: true },
      ]}
    />
  );
}

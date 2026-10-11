"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

type Field = {
  id: string;
  name: string;
  type: string;
  values: string | null;
  required: boolean;
};

type FormWindow = {
  id: string;
  name: string;
  kind: "admission" | "enquiry";
  status: "open" | "hidden";
  belongTo: string;
  opensAt?: string | null;
  closesAt?: string | null;
  fields?: Field[];
};

export default function AdmissionFormsOps() {
  const { t } = useI18n();
  const [forms, setForms] = useState<FormWindow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  async function load() {
    const json = await fetch("/api/v1/form-templates").then((r) => r.json());
    setForms(json.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/form-templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        kind: form.get("kind"),
        status: form.get("status"),
        belong_to: form.get("belongTo") || undefined,
        opens_at: form.get("opensAt") || null,
        closes_at: form.get("closesAt") || null,
      }),
    });
    setMessage(res.ok ? t("Saved") : t("Could not save"));
    event.currentTarget.reset();
    load();
  }

  async function hide(id: string) {
    const res = await fetch("/api/v1/open-forms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ form_id: id, hidden: true }),
    });
    setMessage(res.ok ? t("Saved") : t("Could not save"));
    load();
  }

  async function select(id: string) {
    setActive(id);
    const json = await fetch(`/api/v1/form-templates/${id}/builder`).then((r) =>
      r.json(),
    );
    if (Array.isArray(json.fields)) {
      setForms((prev) =>
        prev.map((form) => (form.id === id ? { ...form, fields: json.fields } : form)),
      );
    }
  }

  async function addField(event: FormEvent<HTMLFormElement>, belongTo: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/custom-fields", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        belongTo,
        name: form.get("name"),
        type: form.get("type") || "Input",
        values: form.get("values") || undefined,
        required: form.get("required") === "on",
      }),
    });
    setMessage(res.ok ? t("Saved") : t("Could not save"));
    event.currentTarget.reset();
    load();
  }

  const current = forms.find((form) => form.id === active) ?? forms[0];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">{t("Admission forms")}</h1>
      <p className="text-sm text-[var(--muted)]">
        {t(
          "Open or hide admission and enquiry windows. Extra questions come from custom fields for that template.",
        )}
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3 sm:grid-cols-2" onSubmit={onCreate}>
        <div className="sm:col-span-2">
          <Label htmlFor="form-name">{t("Name")}</Label>
          <Input id="form-name" name="name" required />
        </div>
        <div>
          <Label>{t("Kind")}</Label>
          <select name="kind" className={SELECT} defaultValue="admission">
            <option value="admission">{t("Online admission")}</option>
            <option value="enquiry">{t("Admission enquiry")}</option>
          </select>
        </div>
        <div>
          <Label>{t("Status")}</Label>
          <select name="status" className={SELECT} defaultValue="open">
            <option value="open">{t("Open")}</option>
            <option value="hidden">{t("Hidden")}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="belongTo">{t("Template")}</Label>
          <Input
            id="belongTo"
            name="belongTo"
            placeholder="Admission"
          />
        </div>
        <div>
          <Label htmlFor="opensAt">{t("Opens")}</Label>
          <Input id="opensAt" name="opensAt" type="date" />
        </div>
        <div>
          <Label htmlFor="closesAt">{t("Closes")}</Label>
          <Input id="closesAt" name="closesAt" type="date" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">{t("Save")}</Button>
        </div>
      </form>
      <div className="grid gap-4 sm:grid-cols-2">
        <ul className="space-y-2 text-sm">
          {forms.map((form) => (
            <li key={form.id}>
              <button
                type="button"
                className="underline-offset-4 hover:underline"
                onClick={() => select(form.id)}
              >
                {form.name}
              </button>{" "}
              · {form.kind} · {form.status}
              {form.status === "open" ? (
                <>
                  {" "}
                  <Button size="sm" variant="ghost" onClick={() => hide(form.id)}>
                    {t("Hidden")}
                  </Button>
                </>
              ) : null}{" "}
              <Button
                size="sm"
                onClick={async () => {
                  const res = await fetch(`/api/v1/form-templates/${form.id}`, {
                    method: "DELETE",
                  });
                  setMessage(res.ok ? t("Saved") : t("Could not save"));
                  if (res.ok) load();
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        {current ? (
          <div className="space-y-3">
            <h2 className="font-display text-2xl">
              {t("Template fields")} · {current.belongTo}
            </h2>
            <ul className="text-sm">
              {(current.fields ?? []).map((field) => (
                <li key={field.id}>
                  {field.name}
                  {field.required ? " *" : ""} · {field.type}
                </li>
              ))}
            </ul>
            <form
              className="grid gap-2"
              onSubmit={(event) => addField(event, current.belongTo)}
            >
              <Input name="name" placeholder={t("Field name")} required />
              <select name="type" className={SELECT} defaultValue="Input">
                <option value="Input">{t("Input")}</option>
                <option value="Number">{t("Number")}</option>
                <option value="Date">{t("Date")}</option>
                <option value="Select">{t("Select")}</option>
                <option value="Textarea">{t("Textarea")}</option>
              </select>
              <Input name="values" placeholder={t("Options, comma separated")} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="required" />
                {t("Required")}
              </label>
              <Button type="submit" size="sm">
                {t("Add field")}
              </Button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

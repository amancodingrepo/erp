"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Mode = "email-template" | "sms-template" | "compose" | "log" | "reminder";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function CommsOps({ mode }: { mode: Mode }) {
  if (mode === "sms-template") return <TemplatePanel channel="SMS" />;
  if (mode === "compose") return <ComposePanel />;
  if (mode === "log") return <LogPanel />;
  if (mode === "reminder") return <ReminderPanel />;
  return <TemplatePanel channel="EMAIL" />;
}

function TemplatePanel({ channel }: { channel: "EMAIL" | "SMS" }) {
  const [rows, setRows] = useState<Array<{ id: string; name: string; body: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch(`/api/v1/message-templates?channel=${channel}`).then((r) =>
      r.json(),
    );
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, [channel]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/message-templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        channel,
        name: form.get("name"),
        subject: form.get("subject") || undefined,
        body: form.get("body"),
      }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">{channel} templates</h1>
      <p className="text-sm text-[var(--muted)]">
        Placeholders: {"{{name}} {{admissionNo}} {{balance}} {{campus}}"}
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="fee_due" required />
        {channel === "EMAIL" ? <Input name="subject" placeholder="Subject" /> : null}
        <Label htmlFor="body">Body</Label>
        <textarea
          id="body"
          name="body"
          required
          rows={5}
          className="w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
        />
        <Button type="submit">Save template</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            <strong>{r.name}</strong> — {r.body.slice(0, 80)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComposePanel() {
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; channel: string }>>(
    [],
  );
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/message-templates")
      .then((r) => r.json())
      .then((j) => setTemplates(j.data ?? []));
    fetch("/api/v1/classes")
      .then((r) => r.json())
      .then((j) => setClasses(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/messages/compose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        templateId: form.get("templateId"),
        classId: form.get("classId") || undefined,
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? `Queued ${json.sent}` : json.message ?? json.error);
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Send email / SMS</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="templateId" className={SELECT} required>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.channel} · {t.name}
            </option>
          ))}
        </select>
        <select name="classId" className={SELECT}>
          <option value="">All active students</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}

function LogPanel() {
  const [rows, setRows] = useState<
    Array<{ id: string; channel: string; toAddress: string; status: string; body: string }>
  >([]);
  useEffect(() => {
    fetch("/api/v1/message-logs")
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []));
  }, []);
  return (
    <div>
      <h1 className="font-display text-4xl">Email / SMS log</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.channel} → {r.toAddress} · {r.status}
            <div className="text-[var(--muted)]">{r.body.slice(0, 120)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReminderPanel() {
  const [message, setMessage] = useState<string | null>(null);
  async function run(channel: "SMS" | "EMAIL") {
    const res = await fetch("/api/v1/reminders/fees", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    const json = await res.json();
    setMessage(res.ok ? `Reminded ${json.sent}, skipped ${json.skipped}` : json.message);
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Fee reminders</h1>
      <p className="text-sm text-[var(--muted)]">
        Uses the <code>fee_due</code> template. Students without mobile/email are skipped.
        Messages are logged; set EMAIL_WEBHOOK_URL / SMS_WEBHOOK_URL to deliver.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <div className="flex gap-3">
        <Button type="button" onClick={() => run("SMS")}>
          Run SMS reminders
        </Button>
        <Button type="button" variant="ghost" onClick={() => run("EMAIL")}>
          Run email reminders
        </Button>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "gmeet" | "zoom" | "gmeet-report" | "zoom-report" | "settings";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function LiveClassOps({ mode }: { mode: Mode }) {
  if (mode === "settings") {
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="font-display text-4xl">Live class settings</h1>
        <p className="text-sm text-[var(--muted)]">
          This campus stores Google Meet and Zoom links only. API credentials and
          in-app meeting creation are not used.
        </p>
      </div>
    );
  }
  const provider = mode === "zoom" || mode === "zoom-report" ? "ZOOM" : "GMEET";
  return (
    <MeetingsPanel
      provider={provider}
      report={mode === "gmeet-report" || mode === "zoom-report"}
    />
  );
}

function MeetingsPanel({
  provider,
  report,
}: {
  provider: "GMEET" | "ZOOM";
  report: boolean;
}) {
  const [rows, setRows] = useState<
    Array<{ id: string; title: string; meetingUrl: string; startsAt: string }>
  >([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch(`/api/v1/live-classes?provider=${provider}`).then((r) =>
      r.json(),
    );
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
    fetch("/api/v1/classes")
      .then((r) => r.json())
      .then((j) => setClasses(j.data ?? []));
  }, [provider]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/live-classes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider,
        title: form.get("title"),
        meetingUrl: form.get("meetingUrl"),
        recordingUrl: form.get("recordingUrl") || undefined,
        startsAt: form.get("startsAt"),
        classId: form.get("classId") || undefined,
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Saved" : json.fields?.meetingUrl ?? json.message ?? json.error);
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">
        {provider === "ZOOM" ? "Zoom" : "Google Meet"} links
      </h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      {!report ? (
        <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
          <Input name="title" placeholder="Title" required />
          <Input
            name="meetingUrl"
            placeholder={
              provider === "ZOOM"
                ? "https://zoom.us/j/…"
                : "https://meet.google.com/…"
            }
            required
          />
          <Input name="recordingUrl" placeholder="Recording URL (optional)" />
          <Input name="startsAt" type="datetime-local" required />
          <select name="classId" className={SELECT}>
            <option value="">No class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="submit">Save URL</Button>
        </form>
      ) : null}
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.title} · {new Date(r.startsAt).toLocaleString()} ·{" "}
            <a className="underline" href={r.meetingUrl} rel="noopener noreferrer" target="_blank">
              Join
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

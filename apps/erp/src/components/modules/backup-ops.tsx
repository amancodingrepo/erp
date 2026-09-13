"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Dump = { name: string; bytes: number; createdAt: string };

export default function BackupOps() {
  const [message, setMessage] = useState<string | null>(null);
  const [dumps, setDumps] = useState<Dump[]>([]);
  const [pending, setPending] = useState(false);

  async function load() {
    const res = await fetch("/api/v1/backup");
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message ?? "Could not load backups");
      return json;
    }
    setDumps(json.dumps ?? []);
    return json;
  }

  useEffect(() => {
    load();
  }, []);

  async function downloadSnapshot() {
    const json = await load();
    if (!json?.counts) return;
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campus-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Snapshot downloaded.");
  }

  async function runDump() {
    setPending(true);
    const res = await fetch("/api/v1/backup", { method: "POST" });
    const json = await res.json();
    setPending(false);
    setMessage(
      res.ok
        ? `Dump ${json.dump?.name} written to the uploads volume.`
        : json.message ?? "pg_dump failed",
    );
    load();
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Backup</h1>
      <p className="text-sm text-[var(--muted)]">
        Campus snapshot is counts and recent audit. Database dumps are
        <code> pg_dump </code>
        files on the uploads volume (last 7 kept). A dump also runs about a
        minute after boot, then once a day.
      </p>
      {message ? <p className="text-sm">{message}</p> : null}
      <div className="flex gap-3">
        <Button type="button" onClick={downloadSnapshot}>
          Download snapshot
        </Button>
        <Button type="button" onClick={runDump} disabled={pending}>
          {pending ? "Dumping…" : "Run database dump"}
        </Button>
      </div>
      <ul className="text-sm">
        {dumps.map((d) => (
          <li key={d.name}>
            {d.name} · {Math.round(d.bytes / 1024)} KB · {d.createdAt}
          </li>
        ))}
        {dumps.length === 0 ? <li>No dumps yet.</li> : null}
      </ul>
    </div>
  );
}

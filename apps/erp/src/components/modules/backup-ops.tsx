"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function BackupOps() {
  const [message, setMessage] = useState<string | null>(null);

  async function download() {
    const res = await fetch("/api/v1/backup");
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message ?? "Could not export");
      return;
    }
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Snapshot downloaded. Database backups stay on Railway Postgres.");
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Backup</h1>
      <p className="text-sm text-[var(--muted)]">
        Download a campus snapshot (counts and recent audit). Full database
        restore uses the Railway Postgres volume. Student files live on the
        uploads volume.
      </p>
      {message ? <p className="text-sm">{message}</p> : null}
      <Button type="button" onClick={download}>
        Download snapshot
      </Button>
    </div>
  );
}

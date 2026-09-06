"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ExamsOps({ mode }: { mode: "grades" | "block" | "results" }) {
  if (mode === "grades") return <GradesPanel />;
  if (mode === "block") return <BlockPanel />;
  return <ResultsPanel />;
}

function GradesPanel() {
  const [rows, setRows] = useState<Array<{ id: string; letter: string; name: string; minPct: number; maxPct: number }>>(
    [],
  );
  async function load() {
    setRows(((await (await fetch("/api/v1/grades")).json()) as { data: typeof rows }).data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/grades", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        letter: form.get("letter"),
        minPct: Number(form.get("minPct")),
        maxPct: Number(form.get("maxPct")),
        points: form.get("points") ? Number(form.get("points")) : undefined,
      }),
    });
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Grades</h1>
      <form className="flex flex-wrap gap-3" onSubmit={onSubmit}>
        <Input name="letter" placeholder="Letter" required />
        <Input name="name" placeholder="Name" required />
        <Input name="minPct" type="number" placeholder="Min %" required />
        <Input name="maxPct" type="number" placeholder="Max %" required />
        <Input name="points" type="number" step="0.01" placeholder="Points" />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.letter} {r.name} ({r.minPct}–{r.maxPct})
          </li>
        ))}
      </ul>
    </div>
  );
}

function BlockPanel() {
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/exam-groups")
      .then((r) => r.json())
      .then((j) => setGroups(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const studentId = String(form.get("studentId"));
    const res = await fetch(`/api/v1/students/${studentId}/result-block`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        examGroupId: form.get("examGroupId"),
        blocked: form.get("blocked") === "true",
        reason: form.get("reason") || undefined,
      }),
    });
    setMessage(res.ok ? "Updated" : "Failed");
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Block / unblock result</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <Input name="studentId" placeholder="Student id" required />
        <select
          name="examGroupId"
          className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          required
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          name="blocked"
          className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          defaultValue="true"
        >
          <option value="true">Block (withhold)</option>
          <option value="false">Unblock</option>
        </select>
        <Input name="reason" placeholder="Reason" />
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}

function ResultsPanel() {
  return (
    <div>
      <h1 className="font-display text-4xl">Exam results</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Use mark entry to finalize papers, then open a student 360 Exams tab or marksheet PDF.
      </p>
    </div>
  );
}

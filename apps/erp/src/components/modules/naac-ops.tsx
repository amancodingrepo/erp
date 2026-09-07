"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "dashboard" | "tasks" | "allocate" | "report";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function NaacOps({ mode }: { mode: Mode }) {
  if (mode === "tasks") return <TasksPanel />;
  if (mode === "allocate") return <AllocatePanel />;
  return <DashboardPanel />;
}

function DashboardPanel() {
  const [rows, setRows] = useState<
    Array<{ number: number; title: string; percent: number; done: number; assignments: number }>
  >([]);
  useEffect(() => {
    fetch("/api/v1/naac/dashboard")
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">NAAC</h1>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.number}>
            C{r.number} {r.title}: {r.percent}% ({r.done}/{r.assignments})
          </li>
        ))}
      </ul>
    </div>
  );
}

function TasksPanel() {
  const [criteria, setCriteria] = useState<Array<{ id: string; number: number; title: string }>>(
    [],
  );
  const [rows, setRows] = useState<Array<{ id: string; title: string; criterion: { number: number } }>>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [c, t] = await Promise.all([
      fetch("/api/v1/naac/criteria").then((r) => r.json()),
      fetch("/api/v1/naac/tasks").then((r) => r.json()),
    ]);
    setCriteria(c.data ?? []);
    setRows(t.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/naac/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        criterionId: form.get("criterionId"),
        title: form.get("title"),
        keyIndicator: form.get("keyIndicator") || undefined,
        dueOn: form.get("dueOn") || undefined,
      }),
    });
    setMessage(res.ok ? "Task saved" : "Could not save");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">NAAC tasks</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="criterionId" className={SELECT} required>
          {criteria.map((c) => (
            <option key={c.id} value={c.id}>
              C{c.number} {c.title}
            </option>
          ))}
        </select>
        <Input name="title" placeholder="Task title" required />
        <Input name="keyIndicator" placeholder="Key indicator" />
        <Input name="dueOn" type="date" />
        <Button type="submit">Add task</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            C{r.criterion.number} · {r.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AllocatePanel() {
  const [tasks, setTasks] = useState<
    Array<{
      id: string;
      title: string;
      evidenceRequired: boolean;
      assignments: Array<{ id: string; status: string; staff: string }>;
    }>
  >([]);
  const [staff, setStaff] = useState<Array<{ id: string; firstName: string; lastName?: string }>>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [t, s] = await Promise.all([
      fetch("/api/v1/naac/tasks").then((r) => r.json()),
      fetch("/api/v1/staff").then((r) => r.json()),
    ]);
    setTasks(t.data ?? []);
    setStaff(s.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const taskId = String(form.get("taskId"));
    const res = await fetch(`/api/v1/naac/tasks/${taskId}/assign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ staffId: form.get("staffId") }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Assigned" : json.message ?? json.error);
    load();
  }
  async function evidence(taskId: string, fileUrl: string, note: string) {
    const res = await fetch(`/api/v1/naac/tasks/${taskId}/evidence`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileUrl, note: note || undefined }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Evidence saved" : json.message ?? json.error);
    load();
  }
  async function complete(id: string) {
    const res = await fetch(`/api/v1/naac/assignments/${id}/complete`, { method: "POST" });
    const json = await res.json();
    setMessage(res.ok ? "Marked done" : json.message ?? json.error);
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Task allocation</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={assign}>
        <select name="taskId" className={SELECT} required>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <select name="staffId" className={SELECT} required>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {[s.firstName, s.lastName].filter(Boolean).join(" ")}
            </option>
          ))}
        </select>
        <Button type="submit">Assign</Button>
      </form>
      <ul className="space-y-3 text-sm">
        {tasks.map((t) => (
          <li key={t.id} className="border-t border-[var(--rule)] pt-3">
            <p>
              {t.title}
              {t.evidenceRequired ? " · evidence required" : ""}
            </p>
            <form
              className="mt-2 flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                evidence(t.id, String(form.get("fileUrl")), String(form.get("note") ?? ""));
              }}
            >
              <Input name="fileUrl" placeholder="Evidence URL or path" required />
              <Input name="note" placeholder="Note" />
              <Button type="submit">Add evidence</Button>
            </form>
            {t.assignments.map((a) => (
              <p key={a.id}>
                {a.staff} · {a.status}{" "}
                {a.status !== "DONE" ? (
                  <button type="button" className="underline" onClick={() => complete(a.id)}>
                    Complete
                  </button>
                ) : null}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

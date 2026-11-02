"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ExamsOps({
  mode,
}: {
  mode: "grades" | "block" | "results" | "performance";
}) {
  if (mode === "grades") return <GradesPanel />;
  if (mode === "block") return <BlockPanel />;
  if (mode === "performance") return <PerformancePanel />;
  return <ResultsPanel />;
}

function GradesPanel() {
  const [rows, setRows] = useState<Array<{ id: string; letter: string; name: string; minPct: number; maxPct: number }>>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);
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
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
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
          <li key={r.id} className="flex flex-wrap items-center gap-2">
            <span>
              {r.letter} {r.name} ({r.minPct}–{r.maxPct})
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                const res = await fetch(`/api/v1/grades/${r.id}`, { method: "DELETE" });
                setMessage(res.ok ? "Grade removed" : "Could not remove grade");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
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

const SELECT =
  "h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

function PerformancePanel() {
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [aspects, setAspects] = useState<Array<{ id: string; name: string }>>([]);
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [desk, setDesk] = useState<{
    assigned: boolean;
    message: string;
    className?: string;
    students: Array<{
      id: string;
      name: string;
      section: string;
      marks: Array<{ exam: string; subject: string; marks: string; absent: boolean }>;
      coScholastic: Array<{ aspect: string; grade: string; remark: string }>;
    }>;
  } | null>(null);
  async function loadAspects() {
    const json = await fetch("/api/v1/co-scholastic/aspects").then((r) => r.json());
    setAspects(json.data ?? []);
  }
  useEffect(() => {
    fetch("/api/v1/classes")
      .then((r) => r.json())
      .then((j) => setClasses(j.data ?? []));
    loadAspects();
  }, []);
  async function load(event?: FormEvent) {
    event?.preventDefault();
    if (!classId) return;
    const json = await fetch(
      `/api/v1/performance?class_id=${encodeURIComponent(classId)}`,
    ).then((r) => r.json());
    setDesk(json);
  }
  async function onAspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/co-scholastic/aspects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    setMessage(res.ok ? "Aspect saved" : "Aspect name required");
    event.currentTarget.reset();
    loadAspects();
  }
  async function onBulk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classId) return;
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/co-scholastic/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        classId,
        aspectId: form.get("aspectId"),
        grade: form.get("grade"),
        remark: String(form.get("remark") ?? "").trim() || undefined,
      }),
    });
    setMessage(res.ok ? "Bulk grades saved" : "Need a template, aspect, and grade");
    load();
  }
  async function onStudent(
    event: FormEvent<HTMLFormElement>,
    studentId: string,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/v1/students/${studentId}/co-scholastic`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        aspectId: form.get("aspectId"),
        grade: form.get("grade"),
        remark: String(form.get("remark") ?? "").trim() || undefined,
      }),
    });
    setMessage(res.ok ? "Grade saved" : "Need a template, aspect, and grade");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Performance report</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="flex flex-wrap items-end gap-2" onSubmit={onAspect}>
        <Input name="name" placeholder="Co-scholastic aspect name" required />
        <Button type="submit">Save aspect</Button>
      </form>
      <ul className="text-sm">
        {aspects.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>{row.name}</span>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                const res = await fetch(`/api/v1/co-scholastic/aspects/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Aspect removed" : "Could not remove aspect");
                if (res.ok) loadAspects();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <form className="flex flex-wrap items-end gap-2" onSubmit={load}>
        <select
          className={SELECT}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">Class</option>
          {classes.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Button type="submit">Open</Button>
      </form>
      {desk && !desk.assigned ? (
        <p className="text-sm text-[var(--muted)]">
          {desk.message || "Performance report template is not assigned to selected class."}
        </p>
      ) : null}
      {desk?.assigned ? (
        <>
          <form className="flex flex-wrap items-end gap-2" onSubmit={onBulk}>
            <select name="aspectId" className={SELECT} required>
              <option value="">Aspect</option>
              {aspects.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <Input name="grade" placeholder="Grade" required />
            <Input name="remark" placeholder="Remark (optional)" />
            <Button type="submit">Apply to class</Button>
          </form>
          <ul className="space-y-3 text-sm">
            {desk.students.map((row) => (
              <li key={row.id} className="space-y-2">
                <p className="font-medium">
                  {row.name} · {row.section}
                </p>
                <p className="text-[var(--muted)]">
                  {row.marks.length
                    ? row.marks
                        .map((mark) => `${mark.exam} ${mark.subject} ${mark.marks}`)
                        .join(" · ")
                    : "No marks yet"}
                </p>
                <p className="text-[var(--muted)]">
                  {row.coScholastic?.length
                    ? row.coScholastic
                        .map(
                          (entry) =>
                            `${entry.aspect} ${entry.grade}${entry.remark ? ` (${entry.remark})` : ""}`,
                        )
                        .join(" · ")
                    : "No co-scholastic grades"}
                </p>
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={(event) => onStudent(event, row.id)}
                >
                  <select name="aspectId" className={SELECT} required>
                    <option value="">Aspect</option>
                    {aspects.map((aspect) => (
                      <option key={aspect.id} value={aspect.id}>
                        {aspect.name}
                      </option>
                    ))}
                  </select>
                  <Input name="grade" placeholder="Grade" required />
                  <Input name="remark" placeholder="Remark (optional)" />
                  <Button type="submit">Save</Button>
                </form>
              </li>
            ))}
            {!desk.students.length ? (
              <li className="text-[var(--muted)]">No students in this class.</li>
            ) : null}
          </ul>
        </>
      ) : null}
    </div>
  );
}
